#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required (source database)" >&2
  exit 1
fi

RESTORE_DATABASE_URL="${RESTORE_DATABASE_URL:-}"
if [[ -z "$RESTORE_DATABASE_URL" ]]; then
  echo "RESTORE_DATABASE_URL is required (isolated staging/target database)" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

echo "==> 1/4 Backup source database"
bash scripts/ops/backup-db.sh "$BACKUP_DIR"
BACKUP_FILE="$(ls -1t "$BACKUP_DIR"/approveflow-*.sql.gz | head -n 1)"

echo "==> 2/4 Restore into drill database"
DATABASE_URL="$RESTORE_DATABASE_URL" bash scripts/ops/restore-db.sh "$BACKUP_FILE"

echo "==> 3/4 Apply migrations on restored database"
DATABASE_URL="$RESTORE_DATABASE_URL" bash scripts/ops/migrate.sh

echo "==> 4/4 Smoke against API (set API_URL to drill/staging endpoint)"
if [[ -n "${API_URL:-}" ]]; then
  bash scripts/ops/smoke.sh
else
  echo "Skipped smoke: set API_URL to run login/notifications checks against a running API."
fi

echo "Restore drill completed. Backup file: $BACKUP_FILE"
