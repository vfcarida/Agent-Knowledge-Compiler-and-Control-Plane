# ADR-002: Modularize MCP Servers by Domain

## Status

Accepted

## Context

Initially, the Model Context Protocol (MCP) server was a monolithic package exposing both filesystem operations (reading candidate OKF profiles) and browser automation actions (submitting applications via Playwright). This combined architecture introduced tight coupling, elevated security risks (where read-only requests could spawn browser instances), and increased execution overhead.

## Decision

We decouple the server into two specialised MCP servers:

1.  `@akcp/mcp-profile-server`: Exposes read-only OKF files and lifecycle schemas. Runs 24/7 with zero risk since it is read-only and offline.
2.  `@akcp/mcp-automation-server`: Exposes high-risk, stateful browser automation drivers behind external networks and HITL approvals. Only launched when actively applying for jobs.

There is no monolithic `@akcp/mcp-server` compatibility layer — the split is a clean break, not a bridge over a legacy package.

## Consequences

- Better security boundaries (isolated credentials).
- Improved testing and package modularity.
- Client applications can connect to one or both servers depending on required capabilities.

## History

Supersedes an earlier internal draft of this decision (previously tracked as a separate "-deprecated" file); consolidated here per [MADR](https://adr.github.io/madr/) convention of using a status field rather than a duplicate file.
