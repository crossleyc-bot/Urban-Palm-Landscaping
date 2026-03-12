#!/bin/bash
# ────────────────────────────────────────────────────────────────────────────
# restore-db-from-s3.sh
#
# Restores the SQLite database (and optionally uploads) from the latest S3
# backup. Run this on the EB instance via SSH or as a one-off command.
#
# Usage:
#   ./scripts/restore-db-from-s3.sh                  # restore latest backup
#   ./scripts/restore-db-from-s3.sh 2026-03-12       # restore specific date
#   ./scripts/restore-db-from-s3.sh --uploads        # also restore uploads
#   ./scripts/restore-db-from-s3.sh 2026-03-12 --uploads
#
# Environment variables:
#   S3_BACKUP_BUCKET  – required – the S3 bucket name
#   DB_PATH           – optional – defaults to /var/app/data/urbanpalm.db
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DB_PATH="${DB_PATH:-/var/app/data/urbanpalm.db}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
BACKUP_DIR="/var/app/data/backups"
RESTORE_UPLOADS=false
TARGET_DATE=""

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --uploads) RESTORE_UPLOADS=true ;;
    *) TARGET_DATE="$arg" ;;
  esac
done

# ── Preflight checks ────────────────────────────────────────────────────────
if [ -z "$S3_BUCKET" ]; then
  echo "[restore] ERROR: S3_BACKUP_BUCKET is not set." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# ── Determine which backup to restore ────────────────────────────────────
if [ -n "$TARGET_DATE" ]; then
  echo "[restore] Looking for backup from ${TARGET_DATE}..."
  S3_KEY=$(aws s3 ls "s3://${S3_BUCKET}/backups/db/" \
    | grep "urbanpalm-${TARGET_DATE}" \
    | sort | tail -1 | awk '{print $4}')
  if [ -z "$S3_KEY" ]; then
    echo "[restore] ERROR: No backup found for date ${TARGET_DATE}." >&2
    echo "[restore] Available backups:"
    aws s3 ls "s3://${S3_BUCKET}/backups/db/" | grep "urbanpalm-"
    exit 1
  fi
  S3_KEY="backups/db/${S3_KEY}"
else
  S3_KEY="backups/db/latest.db.gz"
  echo "[restore] Restoring latest backup..."
fi

# ── Download backup ──────────────────────────────────────────────────────
LOCAL_FILE="${BACKUP_DIR}/restore.db.gz"
echo "[restore] Downloading s3://${S3_BUCKET}/${S3_KEY}"
aws s3 cp "s3://${S3_BUCKET}/${S3_KEY}" "$LOCAL_FILE" --quiet

# ── Back up current database before overwriting ──────────────────────────
if [ -f "$DB_PATH" ]; then
  PRE_RESTORE="${BACKUP_DIR}/pre-restore-$(date -u +%Y-%m-%dT%H%M%SZ).db"
  echo "[restore] Saving current database → ${PRE_RESTORE}"
  cp "$DB_PATH" "$PRE_RESTORE"
fi

# ── Decompress and replace ───────────────────────────────────────────────
echo "[restore] Decompressing and replacing database..."
gunzip -f "$LOCAL_FILE"
RESTORED="${BACKUP_DIR}/restore.db"

# Remove WAL/SHM files from old database
rm -f "${DB_PATH}-wal" "${DB_PATH}-shm"

# Move restored database into place
mv "$RESTORED" "$DB_PATH"
chown webapp:webapp "$DB_PATH" 2>/dev/null || true
echo "[restore] Database restored successfully."

# ── Restore uploads if requested ─────────────────────────────────────────
if [ "$RESTORE_UPLOADS" = true ]; then
  UPLOADS_DIR="/var/app/data/uploads"
  echo "[restore] Restoring uploads from s3://${S3_BUCKET}/backups/uploads/"
  aws s3 sync "s3://${S3_BUCKET}/backups/uploads/" "$UPLOADS_DIR" --quiet
  chown -R webapp:webapp "$UPLOADS_DIR" 2>/dev/null || true
  echo "[restore] Uploads restored."
fi

echo "[restore] Done. You may need to restart the application: sudo systemctl restart web.service"
