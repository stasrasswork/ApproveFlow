# Monitoring and alerting

## Minimum production signals

| Signal | Target | Action |
|--------|--------|--------|
| API 5xx rate | < 1% over 5m | Page on-call |
| `/health/ready` | `database: ok` | Auto-restart / rollback |
| p95 API latency | < 500ms | Investigate slow queries |
| Login failures spike | > 3x baseline | Check auth / brute force |

## Health endpoints

- `GET /health/live` — process is up
- `GET /health/ready` — database reachable

Configure your load balancer / orchestrator to use `/health/ready` for traffic routing.

## Recommended integrations

### Error tracking

Use Sentry, Datadog, or similar APM on the API service. Wire the SDK in `main.ts` when you adopt a provider — not built into the app yet.

### Metrics (Prometheus / Datadog)

Scrape or forward:

- HTTP request count and latency (reverse proxy or APM agent)
- Postgres connections, slow queries, lock waits
- Container CPU/memory

### Logs

- Ship API stdout to your log platform (JSON structured logs recommended).
- Never log email bodies, reset tokens, or invite links.

## Release monitoring window

After each deploy (staging/canary/production), watch for **30–120 minutes**:

1. Error rate and 5xx count
2. p95 latency
3. Auth failure rate
4. DB health (`/health/ready`)
5. Email outbox failures (if SMTP enabled)

Rollback triggers are defined in [rollback.md](rollback.md).
