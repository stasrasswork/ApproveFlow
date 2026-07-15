# Prisma Migration Policy

## Goals

- deterministic migration history
- readable intent in migration names
- no ad-hoc technical names in mainline history

## Naming convention

Use:

`YYYYMMDDHHMMSS_<verb>_<domain>_<purpose>`

Examples:

- `20260709121000_add_handoff_and_approval_records`
- `20260710113000_update_task_due_indexes`

Forbidden patterns:

- names ending with `_1`, `_2`, etc.
- generic labels such as `fix`, `tmp`, `misc`

## Creation process

1. Run `npm run db:migrate -w api` with a descriptive migration name.
2. Review SQL for forward-only safety.
3. Generate Prisma client.
4. Run unit/e2e checks that exercise changed schema paths.

## Legacy exception

Migration `20260708181927_1` is retained as a legacy directory name only (no-op SQL).
Policy enforcement ignores this one directory by design.
Do not add new migrations with `_1` suffixes.

## CI enforcement

CI runs `scripts/check-migration-names.mjs` to validate migration directory naming.
Pull requests with invalid new migration names fail fast.
