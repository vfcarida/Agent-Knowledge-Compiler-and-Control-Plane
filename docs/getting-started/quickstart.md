# Quickstart

Welcome to Agent Knowledge Compiler and Control Plane (AKCP). This guide will help you get your first environment compiled and running in under 5 minutes.

## Prerequisites

- Node.js >= 20.x
- [Corepack](https://nodejs.org/api/corepack.html) enabled (`corepack enable`)

## Minimal Happy Path

As AKCP is not yet published to the npm registry, the fastest way to use it is by cloning the repository and running the CLI directly from the source workspace.

```bash
git clone https://github.com/vfcarida/Agent-Knowledge-Compiler-and-Control-Plane.git
cd Agent-Knowledge-Compiler-and-Control-Plane
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm akcp --help
pnpm akcp validate --bundle examples/career
pnpm akcp compile --config examples/career/akcp.yaml
```

## What did this do?

1. **`pnpm akcp validate`**: Validated the schema, structure, and integrity of the `.agent-context` directory.
2. **`pnpm akcp compile`**: Ingested the raw markdown files, built the Agent Knowledge IR (AK-IR) in memory, linked all references, and generated compiled targets to `examples/career/dist`.

## Serving to Agents

Once compiled, you can boot the local MCP server to allow AI Agents (like Claude or Cursor) to interact with the capabilities:

```bash
pnpm akcp serve mcp --profile career
```

## Next Steps

- Explore the [Enterprise Domain Adapters](../guides/create-domain-adapter.md).
- Learn about [Policy Cards](../specs/policy-cards.md).
- Dig into [MCP Security](../security/mcp-security.md).
