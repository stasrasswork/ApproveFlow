# ApproveFlow API

NestJS backend for ApproveFlow: auth, workspaces, projects, tasks, comments, and the task approval workflow.

Product rules and status transitions: [`../../approveflow-spec.md`](../../approveflow-spec.md).

## Prerequisites

- Node.js 20+
- PostgreSQL 16 (local install or Docker)
- npm

## Quick start

From the repository root, start PostgreSQL:

```bash
docker compose up -d
```

Then in `apps/api`:

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

API listens on `http://localhost:3000` by default. Health check: `GET /health`.

## Environment

Copy `.env.example` to `.env` and adjust values.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | prod | Secret for access/refresh tokens. In production (`NODE_ENV=production`) the app fails to start without it. Dev fallback: `dev-secret-change-me` |
| `PORT` | no | HTTP port (default `3000`) |
| `CORS_ORIGIN` | no | Comma-separated allowed origins. If unset, all origins are allowed (dev-friendly) |

Example (`.env.example`):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
JWT_SECRET="change-me-in-production"
CORS_ORIGIN="http://localhost:5173,http://localhost:3000"
PORT=3000
```

## Database

### Generate Prisma client

Run after schema changes or fresh clone:

```bash
npm run db:generate
```

Generated client output: `src/generated/prisma/`.

### Migrations (development)

Creates/applies migrations interactively:

```bash
npm run db:migrate
```

### Migrations (CI / production)

```bash
npx prisma migrate deploy
```

### Push schema without migrations

For local experiments only:

```bash
npm run db:push
```

### Seed demo data

```bash
npm run db:seed
```

Creates a demo workspace, project, users, and sample tasks. All seed users share password **`password123`**:

| Email | Role |
|-------|------|
| `admin@test.local` | ADMIN |
| `manager@test.local` | MANAGER |
| `member@test.local` | MEMBER |
| `client@test.local` | CLIENT_VIEW |

Login example:

```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"manager@test.local","password":"password123"}'
```

### Prisma Studio

```bash
npm run db:studio
```

## Run

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Dev server with watch mode |
| `npm run build` | Production build (`dist/`) |
| `npm run start:prod` | Run compiled app |
| `npm run lint` | ESLint |

## Tests

### Unit tests

```bash
npm run test:unit
```

### E2E tests

E2E tests use a separate database. One-time setup:

```bash
# create test DB (once)
docker exec -it approveflow-postgres psql -U postgres -c "CREATE DATABASE approveflow_test;"

cp .env.test.example .env.test
npm run test:e2e:setup
```

Run e2e suite:

```bash
npm run test:e2e
```

Run everything:

```bash
npm test
```

E2E loads env from `.env.test` (see `.env.test.example`). Default test database: `approveflow_test`.

## Project layout

```
src/
├── auth/           # JWT auth, login, register, refresh, /auth/me
├── common/         # Access helpers, slug, shared types
├── health/         # GET /health
├── prisma/         # PrismaService
├── projects/       # Projects + project members
├── tasks/          # Tasks, comments, domain transitions
└── workspaces/     # Workspaces + workspace members
test/
├── e2e/            # E2E specs by domain
└── helpers/        # Test app bootstrap, auth, DB reset/seed
prisma/
├── schema.prisma
├── seed.ts
└── seed-fixture.ts # Shared by seed and e2e
```
