#!/bin/bash
# Build frontend on the host (avoids SIGBUS in Docker on low-RAM servers).
# Run from project root. Set NEXT_PUBLIC_API_V1_BASE and NEXT_PUBLIC_API_ASSETS_BASE in project .env before running.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontEnd"

# Load .env from project root so Next.js build sees NEXT_PUBLIC_* vars
[ -f "$ROOT/.env" ] && set -a && . "$ROOT/.env" && set +a

echo "API base for build: ${NEXT_PUBLIC_API_V1_BASE:-<not set>}"
if [ -z "$NEXT_PUBLIC_API_V1_BASE" ] || [ "$NEXT_PUBLIC_API_V1_BASE" = "http://localhost:3000/api/v1" ]; then
  echo "WARNING: Set NEXT_PUBLIC_API_V1_BASE in $ROOT/.env to your server URL (e.g. http://143.198.141.222:3000/api/v1) before building."
fi

echo "Installing dependencies..."
npm ci

echo "Building Next.js (on host)..."
npm run build

echo "Preparing Docker build context..."
CONTEXT="$ROOT/.frontend-docker-context"
rm -rf "$CONTEXT"
mkdir -p "$CONTEXT/standalone" "$CONTEXT/static" "$CONTEXT/public"
cp -r .next/standalone/. "$CONTEXT/standalone/"
cp -r .next/static/. "$CONTEXT/static/"
[ -d public ] && cp -r public/. "$CONTEXT/public/" || true

echo "Building Docker image..."
docker build -f "$ROOT/frontEnd/Dockerfile.prebuilt" -t eventsport-frontend:latest "$CONTEXT"

rm -rf "$CONTEXT"
echo "Done. Image: eventsport-frontend:latest"
echo "Run: docker compose -f docker-compose-prod.prebuilt.yml up -d"
