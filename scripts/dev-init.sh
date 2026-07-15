#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Dev environment init"

if [[ ! -f apps/api/.env ]]; then
  cp apps/api/.env.example apps/api/.env
  echo "Created apps/api/.env from .env.example"
else
  echo "apps/api/.env already exists"
fi

if [[ ! -f apps/api/.env.test ]]; then
  cp apps/api/.env.test.example apps/api/.env.test
  echo "Created apps/api/.env.test from .env.test.example"
else
  echo "apps/api/.env.test already exists"
fi

if [[ ! -f apps/web/.env ]]; then
  cp apps/web/.env.example apps/web/.env
  echo "Created apps/web/.env from .env.example"
else
  echo "apps/web/.env already exists"
fi

echo ""
echo "Next steps:"
echo "  docker compose up -d"
echo "  npm run db:generate -w api && npm run db:migrate -w api && npm run db:seed -w api"
echo "  npm run dev:api   # terminal 1"
echo "  npm run dev:web   # terminal 2"
