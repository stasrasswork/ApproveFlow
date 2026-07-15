# ApproveFlow

B2B SaaS for marketing and creative agencies: structured task approvals, deadlines, and team collaboration in one workspace.

Product rules: [`docs/product/approveflow-spec.md`](docs/product/approveflow-spec.md) · Vision: [`docs/product/approveflow-project-overview.md`](docs/product/approveflow-project-overview.md)

## Monorepo layout

| Path | Description |
|------|-------------|
| `apps/api` | NestJS + Prisma + PostgreSQL |
| `apps/web` | React 19 + Vite + TanStack Query + Tailwind |
| `packages/shared` | Shared labels, roles, slug helpers (hand-written API types live in `apps/web` until OpenAPI schemas are real) |

Dependency lockfile: **root `package-lock.json` only** (npm workspaces). Per-app `node_modules/` folders are created by npm (`install-strategy=nested` in `.npmrc`).

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL) or a local Postgres 16 instance
- npm

## Quick start

### 1. Install dependencies (repository root)

All installs use the root lockfile (`package-lock.json`). Do not run `npm install` inside `apps/*`.

```bash
npm install
npm run dev:init   # creates apps/api/.env, apps/web/.env if missing
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. API

```bash
cd apps/api
# skip cp if you ran npm run dev:init
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

API: `http://localhost:3000` · Health: `GET /health/live`, `GET /health/ready` · OpenAPI UI (non-prod): `http://localhost:3000/docs`

Seed users (password `password123`): `admin@test.local`, `manager@test.local`, `member@test.local`, `client@test.local`

### 4. Web

```bash
cd apps/web
cp .env.example .env
npm run dev
```

Web: `http://localhost:5173` (proxies `/api` → API)

### Run both from root

After step 3–4 env files exist:

```bash
npm run dev:api   # terminal 1
npm run dev:web   # terminal 2
```

## Scripts (root)

| Command | Description |
|---------|-------------|
| `npm run dev:api` | API dev server |
| `npm run dev:web` | Web dev server |
| `npm run build` | Build shared + API + web |
| `npm run build:shared` | Build shared package only |
| `npm run lint` | Lint API + web |
| `npm run test` | Unit tests (API + web) |
| `npm run test:api` | API unit + e2e |
| `npm run test:web` | Web unit tests |
| `npm run test:web:e2e` | Playwright against API + Vite |
| `npm run check:migrations` | Validate Prisma migration directory names |
| `npm run check:env:prod` | Validate `.env.prod` before Docker deploy |
| `npm run dev:init` | Create missing `apps/*/.env` from examples |
| `npm run codegen:openapi` | Regenerate OpenAPI JSON/types (schemas are incomplete until DTOs use `@ApiProperty`) |

## First-time user flow

1. Register at `/register`
2. Create a workspace at `/create-workspace` (you become admin)
3. Invite team members in Settings
4. Create a project, add clients/members to the project, create tasks

## Troubleshooting

### API: `No driver (HTTP) has been selected` / Vite `ECONNREFUSED` on `/auth/*`

The web app proxies to the API on port 3000. If Nest fails to start, Vite cannot reach it.

This monorepo uses `.npmrc` `install-strategy=nested` so Nest and its peers stay under `apps/api/node_modules`. After pulling changes, from the repository root run:

```bash
npm install
npm run dev:api
```

Ensure PostgreSQL is running (`docker compose up -d`) and `apps/api/.env` exists before starting the API.

## Tests

**API e2e** requires a test database — see [`apps/api/README.md`](apps/api/README.md).

```bash
npm run test:api
npm run test:web
npm run test:web:e2e
```

## Production deployment

See [`docs/operations/DEPLOY.md`](docs/operations/DEPLOY.md) for Docker Compose, manual deploy, and Render.

### Docker Compose (fresh production stack)

Removes old Postgres volume and starts clean (fixes password/volume mismatch):

```bash
bash scripts/ops/prod-up-fresh.sh
```

Manual equivalent:

```bash
cp .env.prod.example .env.prod
# set JWT_SECRET and POSTGRES_PASSWORD (must match on first init)
docker compose -f docker-compose.prod.yml --env-file .env.prod down -v
docker compose -f docker-compose.prod.yml --env-file .env.prod up --build
```

Open `http://localhost:8080` (default `WEB_PORT`). Register at `/register` — prod compose does not auto-seed demo users.

**Note:** Changing `POSTGRES_PASSWORD` later requires `down -v` (wipes DB) or keeping the original password.

## Documentation

- [`apps/api/README.md`](apps/api/README.md) — API setup, env, database, tests
- [`apps/web/README.md`](apps/web/README.md) — frontend setup and scripts
- [`docs/product/approveflow-spec.md`](docs/product/approveflow-spec.md) — workflow rules and transition matrix
- [`docs/operations/DEPLOY.md`](docs/operations/DEPLOY.md) — production deployment options
- [`docs/operations/migration-policy.md`](docs/operations/migration-policy.md) — migration naming and CI rules
- [`docs/adr`](docs/adr) — product and architecture decisions
