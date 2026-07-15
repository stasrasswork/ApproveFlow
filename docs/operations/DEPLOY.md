# Production deployment

Deploy ApproveFlow as **PostgreSQL + NestJS API + static React frontend**.

## Architecture

| Component | Dev | Production |
|-----------|-----|------------|
| Database | `docker compose up -d` | Managed Postgres (Render, RDS, Supabase, …) |
| API | `npm run dev:api` | Docker (`Dockerfile.api`) or Node on a host |
| Web | `npm run dev:web` (Vite proxy `/api`) | Static build + nginx or CDN |

The web app calls the API using `VITE_API_URL` (baked in at **build time**).

## Environment variables

### API (`apps/api`)

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | yes | `postgresql://user:pass@host:5432/approveflow?schema=public` |
| `JWT_SECRET` | yes in production | long random string |
| `CORS_ORIGIN` | yes | `https://app.example.com` (comma-separated for multiple) |
| `PORT` | no | `3000` (default) |
| `NODE_ENV` | yes | `production` |
| `REDIS_URL` | no | Redis for shared rate limiting across API instances (falls back to in-memory when unset) |
| `APP_URL` | yes in production | Public frontend URL for email links |
| `SMTP_*` | yes in production | Required for password reset and invite emails |
| `EXPOSE_DEBUG_TOKENS` | yes | Must be `false` in production |

Copy from `apps/api/.env.example` and replace secrets.

### Web (`apps/web`)

| Variable | When | Example |
|----------|------|---------|
| `VITE_API_URL` | build time | see below |

**Choose one strategy:**

1. **Same origin (recommended for Docker Compose)**  
   Build with `VITE_API_URL=/api`. Nginx proxies `/api/*` → API (see `apps/web/nginx.conf`).

2. **Separate API subdomain**  
   Build with `VITE_API_URL=https://api.example.com`. Set API `CORS_ORIGIN=https://app.example.com`.  
   Auth cookies use `Path=/` (host-only), so cookie sessions work on the API host. Configure CORS carefully.

3. **Dev only**  
   Leave empty — Vite dev server proxies `/api` → `localhost:3000`.

### Auth cookies

- Login/refresh set HttpOnly cookies (`access_token`, `refresh_token`) with `Path=/`, `SameSite=Lax`.
- Browser clients do **not** receive JWT strings in JSON bodies (XSS-safe). API clients that send `refresh_token` in the body still receive rotated tokens in the response.
- Mutating cookie-authenticated requests require header `X-Requested-With: ApproveFlow`.
- After deploy, users must sign in again if `JWT_SECRET` changed.

## Option A — Docker Compose (fastest self-hosted)

From the repository root:

```bash
cp .env.prod.example .env.prod
# Edit .env.prod — set JWT_SECRET and optionally POSTGRES_PASSWORD

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Open **http://localhost:8080** (or `WEB_PORT` from `.env.prod`).

The API container starts the server only. Database migrations run in a one-shot `migrate` service before API startup (see `docker-compose.prod.yml`).

For manual deploys, run migrations explicitly:

```bash
bash scripts/ops/backup-db.sh ./backups   # production
bash scripts/ops/migrate.sh
```

## Operations runbooks

- [Backup and restore](backup-restore.md)
- [Rollback playbook](rollback.md)
- [Incident response](incident-response.md)
- [Migration policy](migration-policy.md)
- [Monitoring and alerting](monitoring.md)
- [Performance baseline](performance-baseline.md)

## Release workflow

GitHub Actions workflow `.github/workflows/release.yml` provides preflight checks and environment-gated deploy steps for `staging`, `canary`, and `production`.

Progressive rollout checklist:

1. Staging: migrate + smoke + restore drill
2. Canary: 5–10% traffic, monitor 30–120 minutes
3. Production: 25% → 50% → 100% with rollback triggers

## Pre-deploy checklist

- [ ] Run `npm run check:env:prod` (validates `.env.prod` secrets and SMTP for public URLs)
- [ ] Backup taken for production (`scripts/ops/backup-db.sh`)
- [ ] Migrations applied via `scripts/ops/migrate.sh` (not at API container boot)
- [ ] `JWT_SECRET` is a strong random value (not the dev default)
- [ ] `CORS_ORIGIN` matches your frontend URL(s)
- [ ] `VITE_API_URL` set correctly **before** `npm run build -w web`
- [ ] `npm run lint` and `npm run test` pass in CI
- [ ] Health endpoint responds: `/health/ready`

Useful commands:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f api
docker compose -f docker-compose.prod.yml --env-file .env.prod down
```

## Option B — Build and run manually

### 1. Database

Create a Postgres 16 database and note `DATABASE_URL`.

### 2. API

```bash
npm ci
cd apps/api
cp .env.example .env
# Set DATABASE_URL, JWT_SECRET, CORS_ORIGIN, NODE_ENV=production

npm run db:generate
bash ../../scripts/ops/migrate.sh
npm run build
node dist/main.js
```

Health check: `GET /health/ready`

### 3. Web

```bash
# From repo root
export VITE_API_URL=https://api.example.com   # or /api if same origin
npm run build -w web
```

Serve `apps/web/dist` with any static host (nginx, S3 + CloudFront, Netlify, Vercel, …).

For SPA routing, rewrite all paths to `index.html`.

### nginx example (separate API host)

```nginx
server {
  listen 443 ssl;
  root /var/www/approveflow/dist;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### nginx example (same origin, `/api` proxy)

Use `apps/web/nginx.conf` as a reference.

## Option C — Render

1. Push the repo to GitHub.
2. Create a **Blueprint** from `render.yaml` or create services manually:
   - Postgres database
   - Web service from `Dockerfile.api` (health check: `/health/ready`)
   - Static site: build `npm ci && npm run build:shared && npm run build -w web`, publish `apps/web/dist`
3. Set `CORS_ORIGIN` on the API to your static site URL.
4. Set `VITE_API_URL` on the static site build to the API public URL.
5. Run migrations once against the managed DB (`bash scripts/ops/migrate.sh` with `DATABASE_URL`).

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs lint, API unit + e2e tests, and web build on every push to `main`.

Release gates are defined in `.github/workflows/release.yml`.

## Troubleshooting

**CORS errors in browser** — `CORS_ORIGIN` on the API must include the exact frontend origin (scheme + host + port).

**401 after deploy** — tokens from dev are invalid; sign in again. Check `JWT_SECRET` is stable across API restarts.

**Blank page on refresh** — static host must rewrite unknown paths to `index.html`.

**API cannot connect to DB** — verify `DATABASE_URL`, network access, and that migrations ran.
