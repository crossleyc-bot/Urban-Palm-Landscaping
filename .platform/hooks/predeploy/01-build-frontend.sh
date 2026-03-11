#!/bin/bash
# Build the Vite frontend after npm install, before the app starts.
set -e

cd /var/app/staging
echo "Building frontend with Vite..."
npx vite build
echo "Frontend build complete."
