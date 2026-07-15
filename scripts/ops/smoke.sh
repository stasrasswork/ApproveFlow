#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:8080/api}"
SMOKE_EMAIL="${SMOKE_EMAIL:-manager@test.local}"
SMOKE_PASSWORD="${SMOKE_PASSWORD:-password123}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

# Normalize: allow either https://host/api or https://api.host (no trailing slash)
API_URL="${API_URL%/}"

echo "==> Smoke: liveness"
curl -fsS "$API_URL/health/live" | grep -q '"status":"ok"'

echo "==> Smoke: readiness"
curl -fsS "$API_URL/health/ready" | grep -q '"database":"ok"'

echo "==> Smoke: login (cookie session)"
LOGIN_STATUS="$(curl -sS -o /dev/null -w "%{http_code}" \
  -c "$COOKIE_JAR" \
  -H 'Content-Type: application/json' \
  -H 'X-Requested-With: ApproveFlow' \
  -X POST "$API_URL/auth/login" \
  -d "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"$SMOKE_PASSWORD\"}")"
if [[ "$LOGIN_STATUS" != "200" ]]; then
  echo "Login failed with status $LOGIN_STATUS" >&2
  exit 1
fi

echo "==> Smoke: /auth/me"
curl -fsS -b "$COOKIE_JAR" "$API_URL/auth/me" | grep -q '"email"'

echo "==> Smoke: notifications"
curl -fsS -b "$COOKIE_JAR" "$API_URL/notifications/unread-count" | grep -q '"count"'

echo "Smoke checks passed."
