# ADR-002: Modularize MCP Servers by Domain

## Status

Accepted

## Context

Initially, the Model Context Protocol (MCP) server was a monolithic package exposing both filesystem operations (reading candidate OKF profiles) and browser automation actions (submitting applications via Playwright). This combined architecture introduced tight coupling, elevated security risks (where read-only requests could spawn browser instances), and increased execution overhead.

## Decision

We decouple the server into two specialised MCP servers:

1.  `@akcp/mcp-profile-server`: Exposes read-only OKF files and lifecycle schemas.
2.  `@akcp/mcp-automation-server`: Exposes high-risk browser automation drivers.
    The original `@akcp/mcp-server` remains as a compatibility layer.

## Consequences

- Better security boundaries (isolated credentials).
- Improved testing and package modularity.
- Client applications can connect to one or both servers depending on required capabilities.
