#!/bin/bash
# ────────────────────────────────────────────────────────────────────────────
# backup-db-to-s3.sh
#
# Creates a safe copy of the SQLite database (using .backup command to avoid
# WAL corruption) and uploads it to S3 with a timestamped key.
#
# Keeps the latest 30 daily backups by default. Older backups are cleaned up
# automatically via S3 lifecycle rules (configure in the S3 console or via
# the .ebextensions config).
#
# Environment variables (set in EB environment or .ebextensions):
#   S3_BACKUP_BUCKET  – required – the S3 bucket name
#   DB_PATH           – optional – defaults to /var/app/data/urbanpalm.db
#   BACKUP_RETENTION  – optional – days to keep locally (default: 3)
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DB_PATH="${DB_PATH:-/var/app/data/urbanpalm.db}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
RETENTION_DAYS="${BACKUP_RETENTION:-3}"
BACKUP_DIR="/var/app/data/backups"
TIMESTAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"
BACKUP_FILE="urbanpalm-${TIMESTAMP}.db"

# ── Preflight checks ────────────────────────────────────────────────────────
if [ -z "$S3_BUCKET" ]; then
  echo "[backup] ERROR: S3_BACKUP_BUCKET is not set. Skipping backup." >&2
  exit 1
fi

if [ ! -f "$DB_PATH" ]; then
  echo "[backup] ERROR: Database not found at $DB_PATH. Skipping backup." >&2
  exit 1
fi

# ── Create local backup using SQLite .backup (safe with WAL) ─────────────
mkdir -p "$BACKUP_DIR"
echo "[backup] Creating safe SQLite backup → ${BACKUP_DIR}/${BACKUP_FILE}"
sqlite3 "$DB_PATH" ".backup '${BACKUP_DIR}/${BACKUP_FILE}'"

# ── Compress ─────────────────────────────────────────────────────────────
gzip "${BACKUP_DIR}/${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"
echo "[backup] Compressed → ${BACKUP_FILE}"

# ── Upload to S3 ─────────────────────────────────────────────────────────
S3_KEY="backups/db/${BACKUP_FILE}"
echo "[backup] Uploading to s3://${S3_BUCKET}/${S3_KEY}"
aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" "s3://${S3_BUCKET}/${S3_KEY}" --quiet

# Also keep a "latest" copy for quick restores
aws s3 cp "s3://${S3_BUCKET}/${S3_KEY}" "s3://${S3_BUCKET}/backups/db/latest.db.gz" --quiet
echo "[backup] Upload complete."

# ── Upload uploads directory snapshot ────────────────────────────────────
UPLOADS_DIR="/var/app/data/uploads"
if [ -d "$UPLOADS_DIR" ]; then
  echo "[backup] Syncing uploads to s3://${S3_BUCKET}/backups/uploads/"
  aws s3 sync "$UPLOADS_DIR" "s3://${S3_BUCKET}/backups/uploads/" --quiet --delete
  echo "[backup] Uploads sync complete."
fi

# ── Clean up old local backups ───────────────────────────────────────────
find "$BACKUP_DIR" -name "urbanpalm-*.db.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
echo "[backup] Local cleanup done (kept last ${RETENTION_DAYS} days)."

echo "[backup] Backup completed successfully at ${TIMESTAMP}."
