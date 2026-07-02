#!/bin/sh
set -e

cd /app/apps/api

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting API..."
exec "$@"
