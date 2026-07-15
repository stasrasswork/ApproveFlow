# Backup and restore

## When to run backups

- Before every production migration
- Before major releases
- On a daily schedule for production databases

## Create a backup

```bash
export DATABASE_URL='postgresql://user:pass@host:5432/approveflow?schema=public'
bash scripts/ops/backup-db.sh ./backups
```

For managed Postgres (Render, RDS, Supabase), also enable provider-native automated backups and point-in-time recovery when available.

## Restore drill (staging)

Use the automated drill script against an isolated database:

```bash
export DATABASE_URL='postgresql://user:pass@host:5432/approveflow?schema=public'
export RESTORE_DATABASE_URL='postgresql://user:pass@host:5432/approveflow_drill?schema=public'
export API_URL='https://staging-api.example.com'   # optional smoke step
bash scripts/ops/restore-drill.sh
```

Or manually:

1. Create a fresh staging database.
2. Restore the latest backup:

```bash
DATABASE_URL="$STAGING_DATABASE_URL" bash scripts/ops/restore-db.sh ./backups/approveflow-YYYYMMDDTHHMMSSZ.sql.gz
```

3. Run `bash scripts/ops/migrate.sh` if backup predates latest migration.
4. Smoke test: `bash scripts/ops/smoke.sh` (login, notifications) plus UI task transition.

## Recovery objectives

| Metric | Target |
|--------|--------|
| RPO | 24h (daily backup) or provider PITR if enabled |
| RTO | 2h for full restore + smoke validation |

## Verification checklist

- [ ] Backup file exists and is non-empty
- [ ] Restore completes without errors
- [ ] API `/health/ready` returns `ok`
- [ ] Core user flows pass on restored staging
