#!/bin/bash
# Install native build tools required for better-sqlite3 compilation.
# This runs BEFORE npm install, ensuring gcc/make are available for node-gyp.
set -e

echo "Installing build tools for native addons..."
dnf install -y gcc-c++ make python3 2>/dev/null || yum install -y gcc-c++ make python3
echo "Build tools installed successfully."
