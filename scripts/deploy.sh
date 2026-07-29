#!/usr/bin/env bash
# EventSport — safe production deploy.
#
# Guards against the failure that hit this project on 2026-06-16: an edit to the
# docker-compose volume block made compose create a new EMPTY volume and mount
# that as /data/db, so the app came up with no data. Nothing was deleted — the
# real data sat in the other volume — but the site looked wiped.
#
# This script refuses to deploy unless the database volume resolves to the
# expected pre-existing external volume, and it dumps the database first.
#
# Usage (from anywhere):  scripts/deploy.sh
#   SKIP_BACKUP=1   skip mongodump (not recommended)
#   SKIP_FRONTEND=1 skip the frontend rebuild
set -euo pipefail

EXPECTED_VOLUME="eventsport_mongodb_data_prod"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/eventsport}"
KEEP_BACKUPS="${KEEP_BACKUPS:-5}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

die()  { printf '\n\033[1;31mABORT:\033[0m %s\n' "$*" >&2; exit 1; }
step() { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
ok()   { printf '    \033[32mok\033[0m %s\n' "$*"; }

[ -f .env ] || die ".env not found in $ROOT"

# Read .env literally instead of sourcing it. Values are unquoted and may hold
# shell metacharacters — SMTP_FROM is `EventSport <addr@host>`, and `source`
# reads the `<` as an input redirect and dies. Compose parses this file itself,
# so the file is fine as-is; only shell sourcing is wrong.
env_get() { sed -n "s/^$1=//p" .env | head -1; }

MONGO_CONTAINER="$(env_get MONGO_CONTAINER_NAME)"
MONGO_CONTAINER="${MONGO_CONTAINER:-eventSport_mongodb}"
MONGO_ROOT_USERNAME="$(env_get MONGO_ROOT_USERNAME)"
MONGO_ROOT_PASSWORD="$(env_get MONGO_ROOT_PASSWORD)"
MONGO_DB="$(env_get MONGO_DB)"

# ---------------------------------------------------------------------------
# Guard 1 — compose must resolve the db volume to the external prod volume.
# Reads the *resolved* config, so it catches edits to the volume block itself.
# ---------------------------------------------------------------------------
step "Checking database volume wiring"

resolved="$(docker compose config --format json)" \
  || die "docker compose config failed — fix the compose file before deploying."

read -r vol_name vol_external <<<"$(printf '%s' "$resolved" \
  | jq -r '.volumes.mongodb_data | "\(.name // "<unset>") \(.external // false)"')"

[ "$vol_name" = "$EXPECTED_VOLUME" ] || die \
"compose would mount volume '$vol_name' as the database, expected '$EXPECTED_VOLUME'.
 The volumes block in docker-compose.yml was changed. Deploying now would bring
 the app up against a DIFFERENT (probably empty) database.
 Restore:
     volumes:
       mongodb_data:
         external: true
         name: $EXPECTED_VOLUME"

[ "$vol_external" = "true" ] || die \
"volume '$vol_name' is no longer declared 'external: true'.
 Compose would create and manage it — and delete it on 'docker compose down -v'.
 Restore 'external: true' in docker-compose.yml."

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
# Backup
# ---------------------------------------------------------------------------
if [ "${SKIP_BACKUP:-0}" = "1" ]; then
    printf '    \033[33mskipped\033[0m backup (SKIP_BACKUP=1)\n'
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
    ok "$BACKUP_DIR/env-$stamp.bak"

    # keep only the most recent $KEEP_BACKUPS of each kind
    ls -1t "$BACKUP_DIR"/mongo-*.archive.gz 2>/dev/null | tail -n +$((KEEP_BACKUPS+1)) | xargs -r rm --
    ls -1t "$BACKUP_DIR"/env-*.bak          2>/dev/null | tail -n +$((KEEP_BACKUPS+1)) | xargs -r rm --
fi

# ---------------------------------------------------------------------------
# Deploy
# ---------------------------------------------------------------------------
step "Pulling latest code"
git pull --ff-only
ok "$(git log --oneline -1)"

# Warn about env vars referenced by compose but missing from .env — compose
# substitutes them as empty strings without complaining.
missing="$(docker compose config 2>&1 >/dev/null | grep -oE '"[A-Z_]+" variable is not set' || true)"
[ -n "$missing" ] && printf '    \033[33mwarn\033[0m unset in .env:\n%s\n' "$missing"

step "Building backend"
docker compose build backend

if [ "${SKIP_FRONTEND:-0}" = "1" ]; then
    printf '    \033[33mskipped\033[0m frontend build (SKIP_FRONTEND=1)\n'
else
    step "Building frontend on host"
    # Built outside Docker: the Next.js build needs more RAM than this box can
    # give a Docker builder, and OOMs there as SIGBUS.
    ./scripts/build-frontend-prebuilt.sh
fi

# NOTE: plain 'up -d'. Never 'down -v' here — -v deletes named volumes, and a
# future edit that drops 'external: true' would make that delete the database.
step "Recreating containers"
docker compose up -d

step "Reloading nginx config"
docker compose restart nginx

# ---------------------------------------------------------------------------
# Post-deploy verification
# ---------------------------------------------------------------------------
step "Verifying"
after="$(docker inspect "$MONGO_CONTAINER" \
  --format '{{range .Mounts}}{{if eq .Destination "/data/db"}}{{.Name}}{{end}}{{end}}')"
[ "$after" = "$EXPECTED_VOLUME" ] \
  || die "after deploy, /data/db is '$after' not '$EXPECTED_VOLUME'. Investigate now."
ok "database still on $EXPECTED_VOLUME"

docker compose ps
printf '\n\033[1;32mDeploy complete.\033[0m\n'
