---
status: deprecated
superseded-by: ADR-001
---
# 1. OKF Profile over OKF

Date: 2026-07-08

## Status

Accepted

## Context

The base OKF specification is minimalist. We need domain-specific constraints for Career Management (Skills, Experiences, Applications) without breaking standard OKF readers.

## Decision

We establish the `akcp.profile/v1` schema running strictly over standard OKF directories. All extensions use standard YAML Frontmatter, leaving unknown keys intact.

## Consequences

Generic OKF tooling can still parse AKCP bundles. Domain-specific LLMs can leverage the stricter schema.
