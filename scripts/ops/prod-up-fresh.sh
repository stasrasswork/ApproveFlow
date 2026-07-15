#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.prod}"
COMPOSE_FILE="docker-compose.prod.yml"
REGENERATE_SECRETS=false

for arg in "$@"; do
  case "$arg" in
    --regenerate-secrets) REGENERATE_SECRETS=true ;;
    -h|--help)
      echo "Usage: bash scripts/ops/prod-up-fresh.sh [--regenerate-secrets]"
      echo "  Creates or fixes .env.prod, removes volumes, starts production stack."
      exit 0
      ;;
  esac
done

generate_secret() {
  openssl rand -base64 32 | tr -d '/+=' | head -c 40
}

is_weak_secret() {
  local value="$1"
  [[ -z "$value" ]] && return 0
  [[ ${#value} -lt 32 ]] && return 0
  [[ "$value" == replace-with* ]] && return 0
  return 1
}

ensure_env_file() {
  if [[ ! -f "$ENV_FILE" ]]; then
    cp .env.prod.example "$ENV_FILE"
    echo "Created $ENV_FILE from .env.prod.example"
    REGENERATE_SECRETS=true
  fi

  local jwt pg
  jwt="$(grep -E '^JWT_SECRET=' "$ENV_FILE" | cut -d= -f2- || true)"
  pg="$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" | cut -d= -f2- || true)"

  if [[ "$REGENERATE_SECRETS" == true ]] || is_weak_secret "$jwt"; then
    jwt="$(generate_secret)"
    if [[ "$(uname)" == Darwin ]]; then
      sed -i '' "s/^JWT_SECRET=.*/JWT_SECRET=${jwt}/" "$ENV_FILE"
    else
      sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${jwt}/" "$ENV_FILE"
    fi
    echo "Generated JWT_SECRET in $ENV_FILE"
  fi

  if [[ "$REGENERATE_SECRETS" == true ]] || is_weak_secret "$pg"; then
    pg="$(generate_secret)"
    if [[ "$(uname)" == Darwin ]]; then
      sed -i '' "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${pg}/" "$ENV_FILE"
    else
      sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${pg}/" "$ENV_FILE"
    fi
    echo "Generated POSTGRES_PASSWORD in $ENV_FILE"
  fi
}

ensure_env_file

echo "Validating $ENV_FILE..."
node scripts/check-env-prod.mjs

echo "Stopping stack and removing volumes (fresh database)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v --remove-orphans

echo "Building and starting production stack..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up --build -d

WEB_PORT="$(grep -E '^WEB_PORT=' "$ENV_FILE" | cut -d= -f2- || true)"
WEB_PORT="${WEB_PORT:-8080}"

echo ""
echo "Production stack started from scratch."
echo "Open: http://localhost:${WEB_PORT}/register"
echo ""
echo "Logs: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f"
