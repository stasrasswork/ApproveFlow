# Rollback playbook

Use this when a release causes errors, data corruption risk, or failed smoke tests.

## Decision triggers

- Error rate > 2x baseline for 10+ minutes
- Failed `/health/ready` on new API revision
- Critical auth/task flow broken in smoke tests
- Migration applied but app revision incompatible

## 1. Stop the bleed

1. Pause progressive rollout (stop canary / scale new revision to 0).
2. Route traffic back to previous stable app revision/image.
3. Announce incident channel status: **investigating**.

## 2. Application rollback

```bash
# Example: redeploy previous image tag
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d api web --no-deps
```

Record:
- previous image digest/tag
- deploy timestamp
- operator

## 3. Database rollback strategy

ApproveFlow migrations are **forward-only**. Do not run `prisma migrate reset` in production.

| Scenario | Action |
|----------|--------|
| Migration not yet applied | Do not apply migration; keep previous app |
| Migration applied, backward-compatible | Roll back app only |
| Migration applied, breaking change | Restore DB from pre-migration backup (see `backup-restore.md`) |

## 4. Post-rollback validation

- [ ] `/health/live` and `/health/ready` are `ok`
- [ ] Login/logout works
- [ ] Task transition + comments + notifications work
- [ ] No elevated 5xx in logs

## 5. Follow-up

- Root cause document in incident ticket
- Add regression test for failure mode
- Re-plan release with fixed revision
