# IT Operations Flagship Demo - 15 Minute Walkthrough

This guide walks you through the entire AKCP lifecycle for the IT Operations domain, demonstrating compilation, validation, policy enforcement, and MCP serving.

Ensure you are at the root of the AKCP repository before running these commands.

## 1. Validate the Configuration

Verify that the `akcp.yaml` is structurally sound.

```bash
pnpm akcp config validate --file examples/domains/it-operations/akcp.yaml
```

_Expected Output_: `[OK] Configuration is valid.`

## 2. Compile the Knowledge Graph

Compile the raw IT Operations knowledge (services, runbooks, incidents) into the Agent Knowledge Intermediate Representation (AK-IR) and generate the specified targets.

```bash
pnpm akcp compile --bundle examples/domains/it-operations --target all --provenance
```

_Expected Output_: Manifest written to `dist/akcp-manifest.json` along with `agent-knowledge-ir.json` and `mcp-resources.json`.

## 3. Inspect the Compiled Artifact

Review the generated cryptographic manifest to ensure all targets were built.

```bash
pnpm akcp inspect-artifact examples/domains/it-operations/dist/akcp-manifest.json
```

_Expected Output_: A list of targets (IR JSON, MCP resources, okf bundle, etc.) with their SHA hashes and byte sizes.

## 4. Validate Policies

Ensure that the HITL policies (e.g., `restart_service.policy.yaml`) are correctly formed.

```bash
pnpm akcp policy validate examples/domains/it-operations/policies/restart_service.policy.yaml
```

_Expected Output_: `[OK] Policy is structurally valid and well-formed.`

## 5. Serve via MCP

Launch the local MCP Profile Server, mounting the compiled IT Operations context.

```bash
pnpm akcp serve:mcp examples/domains/it-operations --ir examples/domains/it-operations/dist/agent-knowledge-ir.json
```

_Expected Behavior_: The MCP server starts and listens on standard input/output (stdio), ready to connect to Claude Desktop or any MCP-compatible agent client.

## 6. Run Evaluations

Measure the operational readiness of the knowledge pack by running the IT Operations evaluation suite.

```bash
pnpm test -- --run
```

_(Currently implemented as part of the core vitest runner)._
