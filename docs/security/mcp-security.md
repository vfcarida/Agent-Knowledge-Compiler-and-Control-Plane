# MCP Security and Threat Model

This document outlines the security architecture for the Agent Knowledge Compiler and Control Plane (AKCP) when exposing Model Context Protocol (MCP) capabilities to autonomous agents.

```mermaid
flowchart TD
    A[Agent Action] --> B[MCP Gateway Route]
    B --> C{Risk Level?}
    C -->|LOW| D[Execute Directly]
    C -->|MEDIUM| E[Audit & Rate Limit]
    E --> D
    C -->|HIGH| F{Approved?}
    F -->|Yes| D
    F -->|No| G[Block & Notify Human]
```

AKCP provides a highly robust, governed Model Context Protocol (MCP) layer. Security is built-in at both the schema and runtime levels.

## Capability Risk Metadata

All tools exposed to an agent via MCP must include Risk Metadata defined in their `CapabilityRegistry` entry:

- **riskLevel**: Defines the inherent danger of the tool (`low`, `medium`, `high`, `critical`).
- **sideEffects**: Classifies whether the tool interacts with external systems or performs destructive actions.
- **requiresApproval**: Determines if human-in-the-loop (HITL) approval is needed.

## Tool Contracts & Telemetry

When an agent invokes a tool, AKCP's `MCPGateway` ensures the result conforms to the `ToolSuccess` or `ToolFailure` contract. 

```json
{
  "ok": true,
  "data": { ... },
  "meta": {
    "requestId": "1234-abcd",
    "toolName": "execute_runbook",
    "toolVersion": "1.0.0",
    "schemaVersion": "1.0.0",
    "durationMs": 150,
    "riskLevel": "critical"
  }
}
```

The gateway intercepts every execution. Tools with `requiresApproval = true` will block execution until explicit approval is granted via the AKCP dashboard (this flow can be simulated locally).

## Prompt Injection and Tool Shadowing

AKCP mitigates common LLM attack vectors:
- **Schema Bypass Attempt:** Tools validate inputs strictly against their defined `inputsSchema` via Zod before invoking underlying logic.
- **Tool Shadowing:** The compiler errors out if two capabilities share the same `name` or `id`.
- **Side Effect Exfiltration:** Tools with `external-write` side effects are logged with full provenance, including the originating `requestId`.

## Running Conformance Tests

To verify the security of the MCP surface, AKCP includes dedicated contract and security tests:

```bash
pnpm run test:security
pnpm run test:mcp
```
