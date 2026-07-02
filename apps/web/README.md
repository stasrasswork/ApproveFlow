# ApproveFlow Web

React frontend for ApproveFlow: auth, projects, tasks, approvals, and team settings.

Product rules: [`../../approveflow-spec.md`](../../approveflow-spec.md)

## Prerequisites

- Node.js 20+
- ApproveFlow API running on `http://localhost:3000`

## Setup

From the repository root (once):

```bash
npm install
```

Then in `apps/web`:

```bash
cp .env.example .env
npm run dev
```

App: `http://localhost:5173`

The dev server proxies `/api/*` to the backend (see `vite.config.ts`).

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | API base path (use full URL in production if not proxied) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run test:watch` | Vitest watch mode |

## Routes

| Path | Description |
|------|-------------|
| `/login`, `/register` | Auth |
| `/create-workspace` | Onboarding — create agency workspace |
| `/w/:workspaceId/projects` | Project list |
| `/w/:workspaceId/projects/:projectId` | Project dashboard |
| `/w/:workspaceId/projects/:projectId/tasks/:taskId` | Task detail |
| `/w/:workspaceId/members` | Workspace settings & team |
