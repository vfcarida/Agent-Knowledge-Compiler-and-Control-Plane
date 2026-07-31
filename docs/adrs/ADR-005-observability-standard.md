# ADR-005: Observability and Telemetry Standard

## Status

Accepted

## Context

Diagnosing tool failures, filesystem parsing issues, and browser delays across decoupled MCP processes requires unified tracing.

## Decision

We deploy the **OpenTelemetry (OTel) Node.js SDK** in core and servers. Tracing spans are injected around:

- Core filesystem read/write/parse events.
- MCP tool calls latency.
- Playwright page interactions.
  Custom counters (e.g. `akcp_mcp_tool_calls_total`) track success/failure rates.

## Consequences

- Standardised JSON metrics output.
- Direct connectivity with standard collectors (Jaeger, Prometheus).
- Operations teams can plug any OTel-compatible collector into the MCP servers without code changes.

## History

Supersedes an earlier internal draft of this decision (previously tracked as a separate "-deprecated" file); consolidated here per [MADR](https://adr.github.io/madr/) convention of using a status field rather than a duplicate file.
