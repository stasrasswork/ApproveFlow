# ADR 0001: COMPLETED status remains informational

## Status

Accepted

## Context

`ProjectStatus.COMPLETED` previously drifted into UI read-only behavior, which contradicted the product specification.

The product spec explicitly states project status in MVP is informational and does not gate:

- task creation
- task transitions
- comments
- due date updates
- membership operations

## Decision

In MVP, `ACTIVE`, `PAUSED`, and `COMPLETED` are informational-only labels.

UI and API must not enforce edit restrictions based solely on project status.
Workflow restrictions are driven only by task transition matrix and role permissions.

## Consequences

- Prevents hidden policy drift between implementation and spec.
- Keeps project status useful for reporting without blocking delivery operations.
- Any future read-only behavior for completed projects requires a new ADR + spec update.
