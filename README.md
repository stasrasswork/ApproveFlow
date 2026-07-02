# ApproveFlow

B2B SaaS for marketing and creative agencies: structured task approvals, deadlines, and team collaboration in one workspace.

Product rules: [`approveflow-spec.md`](approveflow-spec.md) · Vision: [`approveflow-project-overview.md`](approveflow-project-overview.md)

## Monorepo layout

| Path | Description |
|------|-------------|
| `apps/api` | NestJS + Prisma + PostgreSQL |
| `apps/web` | React 19 + Vite + TanStack Query + Tailwind |

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
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. API

```bash
cd apps/api
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

API: `http://localhost:3000` · Health: `GET /health` · OpenAPI: `http://localhost:3000/docs`

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
| `npm run build` | Build API + web |
| `npm run lint` | Lint API + web |
| `npm run test` | Unit tests (API + web) |
| `npm run test:api` | API unit + e2e |
| `npm run test:web` | Web unit tests |

## First-time user flow

1. Register at `/register`
2. Create a workspace at `/create-workspace` (you become admin)
3. Invite team members in Settings
4. Create a project, add clients/members to the project, create tasks

## Troubleshooting

### API: `No driver (HTTP) has been selected` / Vite `ECONNREFUSED` on `/auth/*`

The web app proxies to the API on port 3000. If Nest fails to start, Vite cannot reach it.

In npm workspaces, Nest-related packages can be hoisted to the repo root while peers (`@nestjs/platform-express`, `class-validator`, `class-transformer`) stay under `apps/api`. Nest then fails to find the HTTP driver or validation libraries.

Root `package.json` lists those peer deps explicitly. After pulling changes, from the repository root run:

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
```

## Production deployment

See [`DEPLOY.md`](DEPLOY.md) for Docker Compose, manual deploy, and Render.

## Documentation

- [`apps/api/README.md`](apps/api/README.md) — API setup, env, database, tests
- [`apps/web/README.md`](apps/web/README.md) — frontend setup and scripts
