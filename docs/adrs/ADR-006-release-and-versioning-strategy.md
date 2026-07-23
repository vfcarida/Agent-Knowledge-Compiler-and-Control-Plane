# ADR-006: Release and Versioning Strategy

## Status

Accepted

## Context

As a multi-package monorepo under development, changes to the core format schema or protocol server tools can break compatibility with downstream client dashboards.

## Decision

We enforce:

- **Semantic Versioning (SemVer)** across all workspace packages.
- **Conventional Commits** format validation in CI.
- Human-centric release summaries via **Keep a Changelog** standard.

## Consequences

- Transparent release cycles.
- Clear breaking change boundaries for schemas.
