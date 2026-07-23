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
  Custom counters track success/failures rates.

## Consequences

- Standardised JSON metrics output.
- Direct connectivity with standard collectors (Jaeger, Prometheus).
