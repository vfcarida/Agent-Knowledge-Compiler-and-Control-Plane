---
status: deprecated
superseded-by: ADR-002
---
# 2. MCP Server Boundaries

Date: 2026-07-08

## Status

Accepted

## Context

Monolithic MCP servers mix read-only personal data with write-heavy, stateful automation operations.

## Decision

Split into `@akcp/mcp-profile-server` (read-only, offline, local data) and `@akcp/mcp-automation-server` (stateful, external networks, approvals).

## Consequences

Users can run the Profile server 24/7 with zero risk. The Automation server is only launched when actively applying for jobs.
