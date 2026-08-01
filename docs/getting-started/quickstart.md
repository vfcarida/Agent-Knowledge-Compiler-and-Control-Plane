# Quickstart

Welcome to Agent Knowledge Compiler and Control Plane (AKCP). This guide will help you get your first environment compiled and running in under 5 minutes.

## Prerequisites

- Node.js >= 20.0.0
- [Corepack](https://nodejs.org/api/corepack.html) enabled (`corepack enable`)

## Minimal Happy Path

As AKCP is not yet published to the npm registry, the fastest way to use it is by cloning the repository and running the CLI directly from the source workspace.

```bash
git clone https://github.com/vfcarida/Agent-Knowledge-Compiler-and-Control-Plane.git
cd Agent-Knowledge-Compiler-and-Control-Plane
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm akcp validate --bundle examples/domains/it-operations --profile it-operations
pnpm akcp compile --config examples/domains/it-operations/akcp.yaml
```

## What did this do?

1. **`pnpm akcp validate`**: Validated the schema, structure, and integrity of the bundle. You should see a success report indicating all files are valid.
2. **`pnpm akcp compile`**: Ingested the raw markdown files, built the Agent Knowledge IR (AK-IR) in memory, linked all references, and wrote compiled targets to `examples/domains/it-operations/dist/` (`agent-knowledge-ir.json`, `mcp-resources.json`, `openwiki/`, `dashboard-meta.json`) plus a build manifest at `dist/akcp-manifest.json`. `.akcp/cache/build-state.json` is a separate, internal incremental-build cache — not the compiled output.

## Serving to Agents

Once compiled, you can boot the local MCP server to allow AI Agents (like Claude or Cursor) to interact with the capabilities:

```bash
pnpm akcp serve mcp --profile it-operations --ir examples/domains/it-operations/dist/agent-knowledge-ir.json
```

You should see output similar to (real transcript):

```
[INFO] Booting MCP Server (Profile: it-operations) for bundle at <cwd>
[AKCP Telemetry] OpenTelemetry NodeSDK initialized successfully.
[AKCP Profile Server] Initializing with Context Pack at: <cwd>/examples/domains/it-operations/dist/agent-knowledge-ir.json
[AKCP Profile Server] Successfully connected via stdio transport.
```

The process then stays running, waiting for an MCP client (e.g. Claude Desktop, Cursor) to connect over stdio — press Ctrl+C to stop it.

## Next Steps

- Explore the [Enterprise Domain Adapters](../guides/create-domain-adapter.md).
- Learn about [Policy Cards](../specs/policy-cards.md).
- Dig into [MCP Security](../security/mcp-security.md).
