# Development Guide

This is a `pnpm` workspace monorepo.

## Structure

- `@akcp/core`: Domain logic, OKF parsing, validation, observability.
- `@akcp/mcp-profile-server`: Read-only MCP server for querying your OKF bundle.
- `@akcp/mcp-automation-server`: Stateful MCP server for browser automation with HITL.
- `@akcp/dashboard`: Experimental React dashboard for inspecting bundles.
- `@akcp/evals`: Evaluation harness.

## Scripts

- `pnpm dev`: Runs the main development servers.
- `pnpm build`: Builds all packages.
- `pnpm lint`: Runs `oxlint` and `eslint`.
- `pnpm typecheck`: Runs `tsc --noEmit`.

## Local Infrastructure

AKCP uses Docker Compose for local dependencies:

```bash
# Start Redis (required for approval store)
pnpm infra:up

# Start with full observability stack (Redis + OTel + Jaeger)
pnpm infra:up:full

# View Jaeger traces at http://localhost:16686

# Stop everything
pnpm infra:down
```
