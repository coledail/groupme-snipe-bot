#!/usr/bin/env bash
set -euo pipefail

# Simple backup script: copies the sqlite DB to /data/backups with a timestamp.
# Ensure this script is executable (`chmod +x scripts/backup_db.sh`).

DB_PATH="${DATABASE_PATH:-/data/dev.db}"
BACKUP_DIR="/data/backups"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "DB file not found at $DB_PATH" >&2
  exit 1
fi

cp "$DB_PATH" "$BACKUP_DIR/snipe-db-$TIMESTAMP.db"
echo "Backup written to $BACKUP_DIR/snipe-db-$TIMESTAMP.db"
