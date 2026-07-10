# AKCP Specification — Index

> **Status:** DRAFT — v0.1.0-draft  
> **Spec Version:** Independent of implementation package versions.  
> **Last Updated:** 2026-07-10

This directory contains the implementation-independent specifications for the Agent Knowledge Compiler and Control Plane (AKCP) system.

## Non-Goals

This specification does **not** prescribe:
- A specific programming language for implementations.
- A particular storage backend for the Intermediate Representation (IR).
- Any specific LLM or embedding model.
- A replacement for the Open Knowledge Format (OKF), Model Context Protocol (MCP), or any other standard it builds upon.

## Relationship to Existing Standards

AKCP is a **complement**, not a replacement:
- **OKF (Open Knowledge Format):** AKCP adopts OKF as its primary source document format. OKF authors; AKCP compiles.
- **MCP (Model Context Protocol):** AKCP exposes compiled artifacts via MCP servers. MCP transmits; AKCP governs what is transmitted.

## Specification Documents

| Document | Description | Status |
|----------|-------------|--------|
| [agent-knowledge-ir.md](agent-knowledge-ir.md) | The Agent Knowledge Intermediate Representation schema | DRAFT |
| [akcp-build-spec.md](akcp-build-spec.md) | Normative compiler behavior and pipeline stages | DRAFT |
| [policy-cards.md](policy-cards.md) | Machine-readable runtime governance schema | DRAFT |
| [artifact-manifest.md](artifact-manifest.md) | Compiled artifact output manifest schema | DRAFT |
| [conformance.md](conformance.md) | Conformance levels and test requirements | DRAFT |

## Versioning

The spec version (`0.1.0-draft`) is independent of implementation package versions (`@ocf/core`, `@ocf/cli`). A spec version is incremented only when normative requirements change. Breaking changes require a major version bump.

## Governance

Changes to this specification MUST follow the RFC process defined in [`docs/rfcs/README.md`](../docs/rfcs/README.md). See also [`docs/adrs/ADR-spec-governance.md`](../docs/adrs/ADR-spec-governance.md).
