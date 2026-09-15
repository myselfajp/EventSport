#!/usr/bin/env bash
# EventSport — switch traffic back to the other colour.
#
# The previous release is still sitting there stopped (deploy-bluegreen.sh stops
# it but never removes it), so rolling back is: start it, check it, point nginx
# at it. No rebuild, no pull, no image tag to remember — seconds, not minutes.
#
# This rolls back CODE ONLY. Both colours share one database: if the release you
# are backing out of migrated data, restore the dump that deploy took first:
#     ls -1t /var/backups/eventsport/mongo-*.archive.gz | head -1
#
# Usage:  scripts/rollback-bluegreen.sh
#   HEALTH_TIMEOUT=60  seconds to wait for the old colour to answer
set -euo pipefail

HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-60}"
COMPOSE_FILE="docker-compose.bluegreen.yml"
COLOR_CONF="nginx/active-color.conf"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

die()  { printf '\n\033[1;31mABORT:\033[0m %s\n' "$*" >&2; exit 1; }
step() { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
ok()   { printf '    \033[32mok\033[0m %s\n' "$*"; }

[ -f .env ] || die ".env not found in $ROOT"
env_get() { sed -n "s/^$1=//p" .env | head -1; }

NGINX_CONTAINER="$(env_get NGINX_CONTAINER_NAME)"
NGINX_CONTAINER="${NGINX_CONTAINER:-eventSport_nginx}"
HTTP_PORT="$(env_get HTTP_PORT)"
HTTP_PORT="${HTTP_PORT:-80}"

compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

step "Determining active colour"
[ -f "$COLOR_CONF" ] || die "$COLOR_CONF missing — cannot tell which colour is live."

if grep -q 'backend_blue' "$COLOR_CONF"; then
    ACTIVE=blue;  TARGET=green
elif grep -q 'backend_green' "$COLOR_CONF"; then
    ACTIVE=green; TARGET=blue
else
    die "$COLOR_CONF names neither colour. Fix it by hand."
fi
ok "active=$ACTIVE  rolling back to=$TARGET"

# The previous colour must still exist as containers. If it was pruned there is
# nothing to roll back to and the honest answer is to redeploy the older tag.
docker inspect "eventSport_backend_${TARGET}" >/dev/null 2>&1 \
  || die "no eventSport_backend_${TARGET} container exists — nothing to roll back to.
 Redeploy the previous tag instead: scripts/deploy-bluegreen.sh <older-tag>"

step "Starting $TARGET"
compose --profile "$TARGET" start "backend_${TARGET}" "frontend_${TARGET}" \
  || die "could not start the $TARGET containers"

step "Waiting for $TARGET (timeout ${HEALTH_TIMEOUT}s)"

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

[ "$healthy" -eq 1 ] || die "$TARGET did not come back healthy. Traffic untouched — still on $ACTIVE.
 Check: docker logs --tail 50 eventSport_backend_${TARGET}"
ok "$TARGET is healthy"

step "Switching traffic $ACTIVE -> $TARGET"
# In place with cat >, never mv: the file is bind-mounted into nginx by inode.
cat > "$COLOR_CONF" <<CONF
# GENERATED FILE — rewritten by the deploy/rollback scripts. Edit those, not this.
#
# Rolled back to $TARGET on $(date -u '+%Y-%m-%d %H:%M:%S UTC').
map \$host \$active_backend  { default "backend_${TARGET}:3000"; }
map \$host \$active_frontend { default "frontend_${TARGET}:3001"; }
CONF

docker exec "$NGINX_CONTAINER" nginx -t >/dev/null 2>&1 \
  || die "nginx rejected the config — traffic still on $ACTIVE."
docker exec "$NGINX_CONTAINER" nginx -s reload \
  || die "nginx reload failed — traffic still on $ACTIVE."

curl -fsS --max-time 10 "http://localhost:${HTTP_PORT}/api/health" >/dev/null \
  || die "site not answering after rollback. Investigate immediately."
ok "public health check passed"

step "Stopping $ACTIVE"
compose --profile "$ACTIVE" stop "backend_${ACTIVE}" "frontend_${ACTIVE}" 2>/dev/null || true

compose ps
printf '\n\033[1;32mRolled back to %s.\033[0m\n' "$TARGET"
