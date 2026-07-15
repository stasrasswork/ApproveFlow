#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/approveflow_test?schema=public}"
export JWT_SECRET="${JWT_SECRET:-ci-test-secret}"
export NODE_ENV=development
export APP_URL="${APP_URL:-http://localhost:5173}"

npm run db:generate -w api
npm exec -w api -- prisma migrate deploy
npm run db:seed -w api
npm run build:shared
npm run build -w api

if [[ ! -f apps/api/dist/main.js ]]; then
  echo "API build missing apps/api/dist/main.js" >&2
  exit 1
fi

node apps/api/dist/main.js &
API_PID=$!

cleanup() {
  kill "$API_PID" 2>/dev/null || true
  kill "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT

ready=0
for _ in $(seq 1 30); do
  if curl -sf http://localhost:3000/health/ready >/dev/null; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" -ne 1 ]]; then
  echo "API failed to become ready on :3000" >&2
  exit 1
fi

npm run dev -w web -- --port 5173 --strictPort &
WEB_PID=$!

ready=0
for _ in $(seq 1 30); do
  if curl -sf http://localhost:5173 >/dev/null; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" -ne 1 ]]; then
  echo "Web failed to become ready on :5173" >&2
  exit 1
fi

npm run test:e2e -w web
