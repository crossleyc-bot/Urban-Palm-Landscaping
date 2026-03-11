#!/bin/bash
# Create upload directories in the staging area before deployment completes.
set -e

cd /var/app/staging
mkdir -p server/uploads/{employees,services,inventory,imports,videos,carousel,taxonomy,resources}
echo "Upload directories created."
