# ADR 0002: Root runtime deps workaround

## Status

Accepted (temporary)

## Context

In npm workspace installs, Nest peer/runtime resolution can fail for API entrypoints when modules are hoisted inconsistently.
This previously caused API startup/runtime failures for:

- `@nestjs/platform-express`
- `class-transformer`
- `class-validator`

## Decision

Keep these three dependencies at repository root as a temporary workspace-resolution workaround.

## Consequences

- Stable local and CI startup behavior.
- Slight duplication of dependency ownership semantics.
- Must be revisited when install strategy and module resolution are standardized.

## Exit criteria

We can remove root-level runtime deps once:

1. API starts reliably with dependencies owned only by `apps/api`.
2. `npm ci`, `npm run build:api`, and `npm run test:e2e -w api` pass in CI without root fallbacks.
3. Team agrees on a locked workspace install strategy.
