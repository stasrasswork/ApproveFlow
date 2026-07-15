#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "Usage: DATABASE_URL=... $0 <backup.sql.gz>" >&2
  exit 1
fi

echo "Restoring $BACKUP_FILE into target database..."
gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
echo "Restore complete."
