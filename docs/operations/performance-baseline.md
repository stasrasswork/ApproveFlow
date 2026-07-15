# Performance baseline

Use this as a starting SLA before production traffic.

## API targets (moderate load)

| Endpoint class | RPS (sustained) | p95 latency | Error budget |
|----------------|-----------------|-------------|--------------|
| Read (GET) | 50 | < 300ms | < 0.5% 5xx |
| Write (POST/PATCH) | 20 | < 500ms | < 1% 5xx |
| Auth | 10 | < 400ms | < 0.5% 5xx |

## Frontend polling budget

With adaptive polling defaults:

- Task detail pages: ~3s interval (higher freshness)
- List/project pages: ~8s interval
- Notifications (panel open): ~3s interval

Estimate: ~4–8 API calls/min per active user on task pages.

## Load test (manual)

```bash
# Example with hey (install separately)
hey -n 1000 -c 20 -H "Authorization: Bearer <token>" \
  https://api.example.com/health/ready
```

Record p50/p95/p99 and error rate. Re-run after major releases.

## Tuning knobs

- `REDIS_URL` — shared rate limiting across API instances
- Frontend `LIVE_REFETCH_MS` / `TASK_LIVE_REFETCH_MS` in `apps/web/src/lib/constants.ts`
- Postgres indexes on `tasks(project_id)`, `notifications(user_id, read, created_at)`
