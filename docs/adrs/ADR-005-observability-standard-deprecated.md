---
status: deprecated
superseded-by: ADR-005
---
# 5. Observability Standard

Date: 2026-07-08

## Status

Accepted

## Context

Troubleshooting autonomous agents requires tracking multi-step tool calls, parse failures, and external automation success rates.

## Decision

Adopt OpenTelemetry (OTel) for standardized metrics (`akcp_mcp_tool_calls_total`) and distributed tracing across all core and server packages.

## Consequences

Operations teams can plug any OTel-compatible collector (Prometheus/Jaeger) into the MCP servers.
