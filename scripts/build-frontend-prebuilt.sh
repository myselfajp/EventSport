#!/bin/bash
# Build frontend on the host (avoids SIGBUS in Docker on low-RAM servers).
# Run from project root. Set NEXT_PUBLIC_API_V1_BASE and NEXT_PUBLIC_API_ASSETS_BASE in project .env before running.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontEnd"

# Export only the NEXT_PUBLIC_* vars the build needs, read literally from .env.
#
# Do NOT `source` this file. Values are unquoted, and SMTP_FROM is of the form
# `EventSport <addr@host>` — the `<` is a shell redirect, so sourcing aborts at
# that line. Everything defined below it (including NEXT_PUBLIC_API_V1_BASE) is
# then silently missing, and NODE_ENV=production from above it stays exported,
# which makes the `npm ci` below skip devDependencies. Without typescript,
# Next.js cannot resolve the `@/*` tsconfig path aliases and the build dies with
# a wall of "Module not found".
if [ -f "$ROOT/.env" ]; then
  while IFS= read -r line; do
    export "$line"
  done < <(grep -E '^NEXT_PUBLIC_[A-Za-z0-9_]+=' "$ROOT/.env")
fi

echo "API base for build: ${NEXT_PUBLIC_API_V1_BASE:-<not set>}"
# This is baked into the client bundle at build time. Building without it yields
# a site that loads and then fails every request, so stop instead.
if [ -z "$NEXT_PUBLIC_API_V1_BASE" ]; then
  echo "ERROR: NEXT_PUBLIC_API_V1_BASE is not set in $ROOT/.env." >&2
  echo "       It is baked into the bundle at build time; refusing to build." >&2
  exit 1
fi
if [ "$NEXT_PUBLIC_API_V1_BASE" = "http://localhost:3000/api/v1" ]; then
  echo "WARNING: NEXT_PUBLIC_API_V1_BASE still points at localhost — set your server URL for a production build."
fi

# devDependencies (typescript, tailwind, postcss) are required to build, so the
# install must not run in production mode regardless of the ambient NODE_ENV.
echo "Installing dependencies..."
NODE_ENV=development npm ci --include=dev

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
