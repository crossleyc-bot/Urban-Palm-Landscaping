#!/bin/bash
# Build the Vite frontend after npm install, before the app starts.
# Database seeding is handled separately by 02-create-upload-dirs.sh
set -e

cd /var/app/staging
echo "Building frontend with Vite..."
npm run build
echo "Frontend build complete."
