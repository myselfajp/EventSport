#!/bin/bash
# Build frontend on the host (avoids SIGBUS in Docker on low-RAM servers).
# Run from project root. Set NEXT_PUBLIC_API_V1_BASE and NEXT_PUBLIC_API_ASSETS_BASE in project .env before running.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontEnd"

# Load .env from project root so Next.js build sees NEXT_PUBLIC_* vars
[ -f "$ROOT/.env" ] && set -a && . "$ROOT/.env" && set +a

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
echo "Run: docker compose -f docker-compose-prod.yml up -d"
