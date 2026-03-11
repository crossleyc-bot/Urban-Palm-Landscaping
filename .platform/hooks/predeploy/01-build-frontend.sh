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

# Platform hooks run as root. The app runs as webapp.
# SQLite WAL mode requires write access, so the database files must be owned by webapp.
echo "Fixing file ownership for webapp user..."
chown -R webapp:webapp /var/app/staging/server/urbanpalm.db* 2>/dev/null || true
echo "Ownership fixed."
