# Monorepo Guide

Welcome to the `Agent Knowledge Compiler and Control Plane` monorepo. This repository uses **PNPM workspaces** to manage multiple interrelated packages, ranging from core compilation engines to agent servers and a frontend dashboard.

## Structure

- `packages/core`: The core compilation engine, interfaces, and lifecycle management.
- `packages/cli`: The command-line interface (`akcp`).
- `packages/conformance`: Testing suite and harness for plugins/adapters.
- `packages/evals`: Tooling and scenarios for evaluating agent performance on OKF bundles.
- `packages/mcp-profile-server`: The MCP Server for reading and querying profiles.
- `packages/mcp-automation-server`: The MCP Server with HITL capabilities for automation and execution.
- `packages/dashboard`: The React/Vite-based dashboard for orchestrating deployments.
- `plugins/*`: Reference plugins and connectors.
- `spec/*`: Specification documents for OKF and the architecture.

## Engineering Hygiene and Standards

### Dependency Unification

All key shared dependencies (such as `typescript`, `vitest`, `zod`, `prettier`, and `@modelcontextprotocol/sdk`) are governed globally by a central **catalog** in `pnpm-workspace.yaml`.
In any package, use the `"catalog:"` specifier in `package.json` to ensure versions are synced repository-wide.

### YAML Formatting & Validation

Configuration is treated as code. All `.yml` and `.yaml` files must pass both formatting and syntax validation.
Run the following locally before pushing:

```bash
pnpm validate:yaml
pnpm format:check
```

### Clean Architecture & Compiled Outputs

By design, all compiled output (`dist/`, `build/`, `.tsbuildinfo`, `.js`, `.js.map`, `.d.ts`) is prevented from being committed. Source directories (`src/`) must **never** contain generated artifacts. Always compile into a dedicated output directory (e.g. `dist/`).

## CI/CD Pipeline

The Continuous Integration pipeline (`.github/workflows/ci.yml`) strictly mirrors the local developer environment.
Every pull request executes:

1. `pnpm validate:yaml`
2. `pnpm format:check`
3. `pnpm lint`
4. `pnpm typecheck`
5. `pnpm build`
6. `pnpm test -- --run`

### GitHub Actions Security

- **Least Privilege Permissions:** Workflows use `permissions: contents: read` by default, expanding only when explicitly required (e.g., CodeQL or Releases).
- **Corepack:** Nodes package manager execution is unified via `corepack enable`, guaranteeing reproducible `pnpm` versions across environments.
