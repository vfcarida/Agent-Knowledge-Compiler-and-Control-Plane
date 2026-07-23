# IT Operations Flagship Demo - Walkthrough

This guide walks you through the entire AKCP lifecycle for the IT Operations domain, demonstrating compilation, validation, policy enforcement, and MCP serving.

Ensure you are at the root of the AKCP repository before running these commands.

## 1. Validate the Configuration

Verify that the bundle is structurally sound and documents conform to the OKF format.

```bash
pnpm akcp validate --bundle examples/domains/it-operations --profile it-operations
```

_Expected Output_: All sources in the bundle pass validation.

## 2. Compile the Knowledge Graph

Compile the raw IT Operations knowledge (services, runbooks, incidents) into the Agent Knowledge Intermediate Representation (AK-IR) and generate the specified targets.

```bash
pnpm akcp compile --config examples/domains/it-operations/akcp.yaml
```

_Expected Output_: `context-pack.json`, `mcp-resources.json`, and an `openwiki/` generated in `dist/`.

## 3. Serve via MCP

Launch the local MCP Profile Server, mounting the compiled IT Operations context.

```bash
pnpm akcp serve mcp --profile it-operations
```

_Expected Behavior_: The MCP server starts and exposes capabilities defined in `capabilities/capabilities.json` and gated by policies in `policies/`.

## 4. Run Conformance Tests

Measure the operational readiness of the knowledge pack by running the IT Operations evaluation suite.

```bash
pnpm --filter @akcp/conformance run test
```
