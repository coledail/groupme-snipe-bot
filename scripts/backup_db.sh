#!/usr/bin/env bash
set -euo pipefail

# Simple backup script: copies the sqlite DB to /data/backups with a timestamp.
# Ensure this script is executable (`chmod +x scripts/backup_db.sh`).

DB_PATH="${DATABASE_PATH:-/data/dev.db}"
BACKUP_DIR="${BACKUP_DIR:-/data/backups}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")

mkdir -p "$BACKUP_DIR" || true

if [ -n "${DATABASE_URL:-}" ]; then
  # Postgres backup path
  if command -v pg_dump >/dev/null 2>&1; then
    OUT="$BACKUP_DIR/snipe-pg-$TIMESTAMP.sql"
    echo "Dumping Postgres database to $OUT"
    pg_dump "$DATABASE_URL" -Fc -f "$OUT"
    echo "Backup written to $OUT"
    exit 0
  else
    echo "pg_dump not found; cannot backup Postgres database" >&2
    exit 1
  fi
fi

if [ ! -f "$DB_PATH" ]; then
  echo "DB file not found at $DB_PATH" >&2
  exit 1
fi

OUT="$BACKUP_DIR/snipe-db-$TIMESTAMP.db"
cp "$DB_PATH" "$OUT"
echo "Backup written to $OUT"
