#!/usr/bin/env bash
# EventSport — blue/green production deploy.
#
# Brings the inactive colour up on the requested image tag, waits for it to pass
# a health check, and only then points nginx at it. A colour that never becomes
# healthy is torn down and the live colour is never touched, so a bad release
# fails closed instead of taking the site down.
#
# Carries over the database guards from scripts/deploy.sh: the 2026-06-16
# incident (compose silently mounting a new empty volume) must stay impossible.
#
# Usage:  scripts/deploy-bluegreen.sh <image-tag>
#   e.g.  scripts/deploy-bluegreen.sh v1.2.0
#
#   HEALTH_TIMEOUT=120  seconds to wait for the new colour (default 120)
#   SKIP_BACKUP=1       skip the pre-deploy mongodump (not recommended)
#   KEEP_OLD=1          leave the previous colour running after the flip
set -euo pipefail

EXPECTED_VOLUME="eventsport_mongodb_data_prod"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/eventsport}"
KEEP_BACKUPS="${KEEP_BACKUPS:-5}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"
COMPOSE_FILE="docker-compose.bluegreen.yml"
COLOR_CONF="nginx/active-color.conf"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

die()  { printf '\n\033[1;31mABORT:\033[0m %s\n' "$*" >&2; exit 1; }
step() { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
ok()   { printf '    \033[32mok\033[0m %s\n' "$*"; }
warn() { printf '    \033[33mwarn\033[0m %s\n' "$*"; }

TAG="${1:-}"
[ -n "$TAG" ] || die "no image tag given. Usage: scripts/deploy-bluegreen.sh <tag>"
[ -f .env ] || die ".env not found in $ROOT"

# Read .env literally instead of sourcing it. Values are unquoted and may hold
# shell metacharacters — SMTP_FROM is `EventSport <addr@host>`, and `source`
# reads the `<` as an input redirect and dies. Compose parses this file itself.
env_get() { sed -n "s/^$1=//p" .env | head -1; }

MONGO_CONTAINER="$(env_get MONGO_CONTAINER_NAME)"
MONGO_CONTAINER="${MONGO_CONTAINER:-eventSport_mongodb}"
NGINX_CONTAINER="$(env_get NGINX_CONTAINER_NAME)"
NGINX_CONTAINER="${NGINX_CONTAINER:-eventSport_nginx}"
MONGO_ROOT_USERNAME="$(env_get MONGO_ROOT_USERNAME)"
MONGO_ROOT_PASSWORD="$(env_get MONGO_ROOT_PASSWORD)"
MONGO_DB="$(env_get MONGO_DB)"
HTTP_PORT="$(env_get HTTP_PORT)"
HTTP_PORT="${HTTP_PORT:-80}"

# The registry path is fixed; only the tag moves between releases. Exported so
# compose substitutes them into docker-compose.bluegreen.yml.
REGISTRY="${REGISTRY:-ghcr.io/myselfajp}"
export BACKEND_IMAGE="${REGISTRY}/eventsport-backend:${TAG}"
export FRONTEND_IMAGE="${REGISTRY}/eventsport-frontend:${TAG}"

compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

# Rewrites the colour file in place. `cat >` and never mv / sed -i: the file is
# bind-mounted into nginx as a single file, so replacing it with a new inode
# would leave the container reading the old one.
flip_to() {
    local colour="$1"
    cat > "$COLOR_CONF" <<CONF
# GENERATED FILE — rewritten by scripts/deploy-bluegreen.sh on every flip.
# Edit the script, not this file. It is gitignored: it is runtime state, and a
# git checkout on the server must not reset which colour is live.
#
# This is the whole blue/green switch: it names which colour's containers the
# server block in eventsport.conf proxies to. A map is used rather than a plain
# variable because nginx has no http-level "set", and it has to live at http
# level so both files see it.
#
# Keyed on \$host with a single default, i.e. deliberately constant — the map is
# a mechanism for defining an http-scoped variable, not real per-host routing.
#
# Switched to $colour on $(date -u '+%Y-%m-%d %H:%M:%S UTC') for tag $TAG.
map \$host \$active_backend  { default "backend_${colour}:3000"; }
map \$host \$active_frontend { default "frontend_${colour}:3001"; }
CONF
}

# ---------------------------------------------------------------------------
# Work out which colour is live, and therefore which one we deploy onto.
# The nginx colour file is the single source of truth: whatever it names is
# what users are actually hitting, regardless of what containers exist.
# ---------------------------------------------------------------------------
step "Determining active colour"

if [ ! -f "$COLOR_CONF" ]; then
    # First deploy on a fresh host. The file has to exist before compose runs:
    # it is bind-mounted into nginx, and Docker silently creates a DIRECTORY at
    # a bind-mount source that does not exist, which nginx then fails to read.
    ACTIVE=none; TARGET=blue
    flip_to "$TARGET"
    ok "no colour file — bootstrapping onto $TARGET"
elif grep -q 'backend_blue' "$COLOR_CONF"; then
    ACTIVE=blue;  TARGET=green
elif grep -q 'backend_green' "$COLOR_CONF"; then
    ACTIVE=green; TARGET=blue
else
    die "$COLOR_CONF names neither colour. Fix it by hand before deploying."
fi
ok "active=$ACTIVE  deploying to=$TARGET  tag=$TAG"

# ---------------------------------------------------------------------------
# Guard 1 — compose must resolve the db volume to the external prod volume.
# Reads the *resolved* config, so it catches edits to the volume block itself.
# ---------------------------------------------------------------------------
step "Checking database volume wiring"

resolved="$(compose config --format json)" \
  || die "docker compose config failed — fix the compose file before deploying."

read -r vol_name vol_external <<<"$(printf '%s' "$resolved" \
  | jq -r '.volumes.mongodb_data | "\(.name // "<unset>") \(.external // false)"')"

[ "$vol_name" = "$EXPECTED_VOLUME" ] || die \
"compose would mount volume '$vol_name' as the database, expected '$EXPECTED_VOLUME'.
 The volumes block in $COMPOSE_FILE was changed. Deploying now would bring the
 app up against a DIFFERENT (probably empty) database.
 Restore:
     volumes:
       mongodb_data:
         external: true
         name: $EXPECTED_VOLUME"

[ "$vol_external" = "true" ] || die \
"volume '$vol_name' is no longer declared 'external: true'.
 Compose would create and manage it — and delete it on 'docker compose down -v'.
 Restore 'external: true' in $COMPOSE_FILE."
ok "compose mounts external volume $EXPECTED_VOLUME"

# Guard 2 — that volume must already exist. external:true means compose will not
# create it; failing here is better than failing halfway through a deploy.
docker volume inspect "$EXPECTED_VOLUME" >/dev/null 2>&1 \
  || die "volume '$EXPECTED_VOLUME' does not exist on this host. Restore it from
 backup before deploying — do NOT create an empty one to get past this check."
ok "volume exists"

# Guard 3 — if mongo is already running, it must be on that same volume.
if docker inspect "$MONGO_CONTAINER" >/dev/null 2>&1; then
    live="$(docker inspect "$MONGO_CONTAINER" \
      --format '{{range .Mounts}}{{if eq .Destination "/data/db"}}{{.Name}}{{end}}{{end}}')"
    [ "$live" = "$EXPECTED_VOLUME" ] || die \
"the running $MONGO_CONTAINER has '$live' mounted at /data/db, not '$EXPECTED_VOLUME'.
 Live data is in '$live'. Deploying would switch databases under the app.
 Decide which volume is authoritative before continuing."
    ok "running container is on the same volume"
fi

# ---------------------------------------------------------------------------
# Backup. Blue/green protects the app tier; it does nothing for the database,
# which both colours share. A migration in the new release hits the live data.
# ---------------------------------------------------------------------------
if [ "${SKIP_BACKUP:-0}" = "1" ]; then
    warn "skipped backup (SKIP_BACKUP=1)"
elif ! docker inspect "$MONGO_CONTAINER" >/dev/null 2>&1; then
    warn "mongo container not running yet — skipping backup (first deploy)"
else
    step "Backing up database"
    mkdir -p "$BACKUP_DIR"
    stamp="$(date +%Y%m%d-%H%M%S)"
    archive="$BACKUP_DIR/mongo-$stamp.archive.gz"

    docker exec "$MONGO_CONTAINER" mongodump \
        --username "$MONGO_ROOT_USERNAME" --password "$MONGO_ROOT_PASSWORD" \
        --authenticationDatabase admin \
        --db "$MONGO_DB" --archive --gzip > "$archive" \
      || die "mongodump failed — not deploying."

    [ -s "$archive" ] || die "backup archive is empty — not deploying."
    ok "$archive ($(du -h "$archive" | cut -f1))"

    cp .env "$BACKUP_DIR/env-$stamp.bak" && chmod 600 "$BACKUP_DIR/env-$stamp.bak"

    ls -1t "$BACKUP_DIR"/mongo-*.archive.gz 2>/dev/null | tail -n +$((KEEP_BACKUPS+1)) | xargs -r rm --
    ls -1t "$BACKUP_DIR"/env-*.bak          2>/dev/null | tail -n +$((KEEP_BACKUPS+1)) | xargs -r rm --
fi

# ---------------------------------------------------------------------------
# Pull and start the target colour. Images are built by CI, never here.
# ---------------------------------------------------------------------------
step "Pulling images $TAG"
docker pull "$BACKEND_IMAGE"  || die "cannot pull $BACKEND_IMAGE"
docker pull "$FRONTEND_IMAGE" || die "cannot pull $FRONTEND_IMAGE"
ok "images present"

# Warn about env vars referenced by compose but missing from .env — compose
# substitutes them as empty strings without complaining.
missing="$(compose config 2>&1 >/dev/null | grep -oE '"[A-Z_]+" variable is not set' || true)"
if [ -n "$missing" ]; then
    warn "unset in .env:"
    printf '%s\n' "$missing"
fi

step "Starting $TARGET"
# mongodb and nginx carry no profile, so this also brings them up on first run.
compose --profile "$TARGET" up -d --force-recreate \
    "backend_${TARGET}" "frontend_${TARGET}" mongodb nginx \
  || die "failed to start $TARGET containers"
ok "containers up"

# ---------------------------------------------------------------------------
# Health gate. Probed from inside the network so it tests the containers
# themselves, not nginx — nginx is still pointing at the OLD colour here.
# ---------------------------------------------------------------------------
step "Waiting for $TARGET to become healthy (timeout ${HEALTH_TIMEOUT}s)"

NETWORK="$(compose config --format json | jq -r '.networks.eventsport_network.name // "eventsport_eventsport_network"')"

probe() {
    docker run --rm --network "$NETWORK" curlimages/curl:latest \
        -fsS --max-time 5 "$1" >/dev/null 2>&1
}

deadline=$(( $(date +%s) + HEALTH_TIMEOUT ))
healthy=0
while [ "$(date +%s)" -lt "$deadline" ]; do
    if probe "http://backend_${TARGET}:3000/api/health" \
    && probe "http://frontend_${TARGET}:3001/"; then
        healthy=1
        break
    fi
    sleep 3
done

if [ "$healthy" -ne 1 ]; then
    step "Health check FAILED — rolling back"
    printf '\n--- last 40 lines, backend_%s ---\n' "$TARGET"
    docker logs --tail 40 "eventSport_backend_${TARGET}" 2>&1 || true
    printf '\n--- last 40 lines, frontend_%s ---\n' "$TARGET"
    docker logs --tail 40 "eventSport_frontend_${TARGET}" 2>&1 || true
    compose --profile "$TARGET" stop "backend_${TARGET}" "frontend_${TARGET}" || true
    compose --profile "$TARGET" rm -f "backend_${TARGET}" "frontend_${TARGET}" || true
    die "$TARGET never became healthy. Traffic is untouched — still on $ACTIVE."
fi
ok "$TARGET is healthy"

# ---------------------------------------------------------------------------
# Flip.
# ---------------------------------------------------------------------------
step "Switching traffic $ACTIVE -> $TARGET"

flip_to "$TARGET"

if ! docker exec "$NGINX_CONTAINER" nginx -t >/dev/null 2>&1; then
    # On a bootstrap there is no previous colour to fall back to, and the file
    # already points at the only colour there is — leave it and fail loudly.
    [ "$ACTIVE" = "none" ] || flip_to "$ACTIVE"
    die "nginx rejected the new config. Traffic is still on $ACTIVE."
fi

docker exec "$NGINX_CONTAINER" nginx -s reload \
  || die "nginx reload failed. Traffic is still on $ACTIVE."
ok "nginx now serving $TARGET"

# ---------------------------------------------------------------------------
# Verify through the front door, then retire the old colour.
# ---------------------------------------------------------------------------
step "Verifying through nginx"
if ! curl -fsS --max-time 10 "http://localhost:${HTTP_PORT}/api/health" >/dev/null; then
    if [ "$ACTIVE" = "none" ]; then
        die "site did not answer through nginx. Nothing to roll back to — this is
 the first deploy. Check: docker logs --tail 50 $NGINX_CONTAINER"
    fi
    step "Public check failed — flipping back to $ACTIVE"
    flip_to "$ACTIVE"
    docker exec "$NGINX_CONTAINER" nginx -s reload || true
    die "site did not answer through nginx on $TARGET. Rolled back to $ACTIVE."
fi
ok "public health check passed"

after="$(docker inspect "$MONGO_CONTAINER" \
  --format '{{range .Mounts}}{{if eq .Destination "/data/db"}}{{.Name}}{{end}}{{end}}')"
[ "$after" = "$EXPECTED_VOLUME" ] \
  || die "after deploy, /data/db is '$after' not '$EXPECTED_VOLUME'. Investigate now."
ok "database still on $EXPECTED_VOLUME"

if [ "$ACTIVE" = "none" ]; then
    : # bootstrap: there is no previous colour to retire
elif [ "${KEEP_OLD:-0}" = "1" ]; then
    warn "leaving $ACTIVE running (KEEP_OLD=1)"
else
    step "Stopping $ACTIVE"
    # Stopped, not removed: rollback-bluegreen.sh restarts these in seconds.
    compose --profile "$ACTIVE" stop "backend_${ACTIVE}" "frontend_${ACTIVE}" 2>/dev/null || true
    ok "$ACTIVE stopped (containers kept for fast rollback)"
fi

compose ps
printf '\n\033[1;32mDeployed %s to %s.\033[0m\n' "$TAG" "$TARGET"
