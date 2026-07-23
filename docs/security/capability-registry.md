# Capability Registry

The **Capability Registry** provides a strictly typed, governable layer over MCP tools, resources, and prompts. In an enterprise environment, exposing raw LLM tools without metadata is a significant security risk. Agents need to know the risk boundaries of the tools they are invoking.

## The Problem with Raw MCP

By default, the Model Context Protocol (MCP) dictates that a server exposes tools with a `name`, `description`, and `inputSchema`.
While functional, this lacks:

- **Risk Assessment**: Is the tool a low-risk local read, or a critical-risk external submit?
- **Approval Requisites**: Does this side-effect require a Human-in-the-Loop token?
- **Context Budget**: Will invoking this tool flood the LLM's context window?

## The Solution: `CapabilityManifest`

AKCP implements the `CapabilityManifest` schema. Before tools are registered to the MCP server, their capabilities are defined and audited in a centralized manifest.

### The `list_capabilities` Tool

All AKCP servers expose a standard MCP tool called `list_capabilities`.

**Agent Instruction**:

> Agents MUST invoke `list_capabilities` when connecting to a new AKCP server to understand the operational boundaries, risk levels, and approval requirements of the available tools.

### Enforcement (CI/CD)

The repository automatically evaluates the registry inside `packages/evals/src/capabilities.test.ts`.

- **Description Enforcement**: A tool cannot be merged if it lacks a descriptive purpose.
- **Risk Enforcement**: All tools must declare a `riskLevel` (`low`, `medium`, `high`, `critical`).
- **Side Effect Governance**: Any tool with a `local-write`, `external-write`, or `external-submit` side effect **MUST** have `requiredApproval: true`. If a developer attempts to expose a dangerous tool without an approval gate, the CI build will fail.

## Generating the Registry

To extract the in-memory capabilities and export them to JSON manifests for audit, run:

```bash
pnpm run generate:registry
```

This command outputs the current state of all tools to the `capabilities/` directory.
