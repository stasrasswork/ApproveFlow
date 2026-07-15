# Incident response

## Severity levels

| Level | Description | Response |
|-------|-------------|----------|
| SEV-1 | Production down or data loss risk | Immediate rollback, all-hands |
| SEV-2 | Major feature broken for most users | Rollback or hotfix within 1h |
| SEV-3 | Partial degradation | Fix in next release window |

## Roles

- **Incident commander**: coordinates response and communication
- **Operator**: executes rollback/migrations/backups
- **Communications**: status updates to stakeholders

## First 15 minutes

1. Acknowledge alert / user report.
2. Assign incident commander.
3. Check `/health/ready`, API logs, DB connectivity.
4. Decide: rollback vs hotfix.
5. Post initial status update.

## Communication template

```
[ApproveFlow] SEV-X incident
Impact: <who/what is affected>
Start: <UTC time>
Current action: <rollback/hotfix/investigating>
Next update: <time>
```

## Useful commands

```bash
# Health
curl -fsS https://api.example.com/health/ready

# Logs (docker compose)
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f api

# Backup before risky action
bash scripts/ops/backup-db.sh ./backups
```

## Post-incident

Within 48 hours:
- Timeline of events
- Root cause
- Corrective actions with owners and due dates
