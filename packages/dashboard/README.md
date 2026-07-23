# @akcp/dashboard

> **Status:** Alpha

Operator dashboard for the **Agent Knowledge Compiler and Control Plane (AKCP)**. Provides visual inspection of compiled artifacts, audit trails, HITL approval queues, and context pack metadata.

## Features

- **Bundle Health** — inspect OKF bundle validation reports and compilation status
- **Audit Trails** — view structured audit logs for all agent actions
- **HITL Approval Queue** — review and approve/reject pending automation actions
- **Context Pack Metadata** — explore compiled knowledge artifacts and their provenance

## Development

```bash
pnpm --filter @akcp/dashboard dev
```

## Testing

```bash
pnpm --filter @akcp/dashboard test
```

E2E tests use Playwright against a local dev server.

## Part of AKCP

This package is part of the [Agent Knowledge Compiler and Control Plane](../../README.md) monorepo.
