#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT_DIR="${1:-./backups}"
mkdir -p "$OUTPUT_DIR"
OUTPUT_FILE="$OUTPUT_DIR/approveflow-${TIMESTAMP}.sql.gz"

echo "Creating backup at $OUTPUT_FILE"
pg_dump "$DATABASE_URL" | gzip > "$OUTPUT_FILE"
echo "Backup complete."
