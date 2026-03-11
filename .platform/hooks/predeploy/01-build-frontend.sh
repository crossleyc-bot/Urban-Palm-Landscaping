#!/bin/bash
# Build the Vite frontend and seed the database after npm install, before the app starts.
set -e

cd /var/app/staging
echo "Building frontend with Vite..."
npm run build
echo "Frontend build complete."

echo "Seeding database..."
npm run seed
echo "Database seeded."
