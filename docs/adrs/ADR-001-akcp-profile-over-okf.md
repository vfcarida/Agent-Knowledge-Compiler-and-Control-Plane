# ADR-001: AKCP Profile Extension Over OKF Base

## Status

Accepted

## Context

The OKF v0.1 format standardises metadata directory files but intentionally leaves schema validations and domain fields open. To maintain consistency across enterprise AI integrations, we require strict schemas and version tracking for professional career types.

## Decision

We establish **AKCP Profile v1** as a versioned extension profile over OKF. Every career record must identify:

- `schemaVersion: "akcp.profile/v1"`
- `bundleVersion: "1.0.0"`
- Discriminated schemas for: `Skill`, `Experience`, `Education`, `Certificate`, `Project`, `Preference`, `Application`.

## Consequences

- Prevents malformed frontmatter from corrupting the AI's matching context.
- Allows automated in-place migration pipelines.
