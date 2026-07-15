#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/approveflow_test?schema=public}"
export JWT_SECRET="${JWT_SECRET:-ci-test-secret}"
export NODE_ENV=development

npm run db:generate -w api
npm exec -w api -- prisma migrate deploy
npm run db:seed -w api
npm run build:shared
npm run build -w api

node apps/api/dist/src/main.js &
API_PID=$!

cleanup() {
  kill "$API_PID" 2>/dev/null || true
  kill "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT

for _ in $(seq 1 30); do
  if curl -sf http://localhost:3000/health/ready >/dev/null; then
    break
  fi
  sleep 1
done

npm run dev -w web -- --port 5173 --strictPort &
WEB_PID=$!

for _ in $(seq 1 30); do
  if curl -sf http://localhost:5173 >/dev/null; then
    break
  fi
  sleep 1
done

npm run test:e2e -w web
