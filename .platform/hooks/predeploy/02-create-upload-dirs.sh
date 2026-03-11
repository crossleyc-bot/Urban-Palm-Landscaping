#!/bin/bash
# Create persistent data directory for SQLite and upload directories.
# Both the database and user uploads are stored in /var/app/data/ so they
# survive redeployments on Elastic Beanstalk.
set -e

cd /var/app/staging

# ─── Persistent data directory ────────────────────────────────────────────
mkdir -p /var/app/data
mkdir -p /var/app/data/uploads/{employees,services,inventory,imports,videos,carousel,taxonomy,resources}
chown -R webapp:webapp /var/app/data

# Copy any bundled upload assets (e.g. seed carousel images) into persistent
# storage if they don't already exist there. Uses -n to never overwrite
# user-uploaded files.
if [ -d /var/app/staging/server/uploads ]; then
  cp -rn /var/app/staging/server/uploads/* /var/app/data/uploads/ 2>/dev/null || true
fi

# Only seed the database if it does not already exist (first deployment).
if [ ! -f /var/app/data/urbanpalm.db ]; then
  echo "First deployment — seeding database..."
  npm run seed
  # seed.js writes to the default dev path; move the DB to the persistent location.
  if [ -f /var/app/staging/server/urbanpalm.db ]; then
    mv /var/app/staging/server/urbanpalm.db  /var/app/data/urbanpalm.db
    mv /var/app/staging/server/urbanpalm.db-wal /var/app/data/urbanpalm.db-wal 2>/dev/null || true
    mv /var/app/staging/server/urbanpalm.db-shm /var/app/data/urbanpalm.db-shm 2>/dev/null || true
  fi
  echo "Database seeded."
else
  echo "Existing database found — skipping seed."
fi

chown -R webapp:webapp /var/app/data 2>/dev/null || true

# ─── Symlink uploads to persistent storage ────────────────────────────────
# Replace the staging uploads directory with a symlink to persistent storage
# so uploaded files (images, videos) survive redeployments.
rm -rf /var/app/staging/server/uploads
ln -sf /var/app/data/uploads /var/app/staging/server/uploads

echo "Persistent storage and upload directories configured."
