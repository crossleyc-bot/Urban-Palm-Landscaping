#!/bin/bash
# Create upload directories in the staging area before deployment completes.
set -e

cd /var/app/staging
mkdir -p server/uploads/{employees,services,inventory,imports,videos,carousel,taxonomy,resources}

# Platform hooks run as root but the app runs as webapp — fix ownership so
# the app can write uploaded files into these directories.
chown -R webapp:webapp /var/app/staging/server/uploads
echo "Upload directories created."
