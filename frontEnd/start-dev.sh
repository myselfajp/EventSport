#!/bin/sh
set -e
cd /app

# Ensure node_modules are installed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Create .next directory and fallback manifest if they don't exist
mkdir -p .next
if [ ! -f ".next/fallback-build-manifest.json" ]; then
  echo '{"pages":{}}' > .next/fallback-build-manifest.json
  chmod 644 .next/fallback-build-manifest.json
fi

npm run dev

