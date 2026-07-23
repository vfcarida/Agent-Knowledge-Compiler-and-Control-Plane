# ADR-007: Specification Governance Model

**Status:** ACCEPTED  
**Date:** 2026-07-10  
**Deciders:** Project Maintainers

## Context

The AKCP repository is transitioning from a single-implementation TypeScript project to a system with an independent, implementation-agnostic specification. To achieve ecosystem adoption, the specification must be stable, versioned, and governed separately from the implementation packages.

## Decision

We will separate the spec (`docs/specs/`) from the implementation (`packages/`) and govern them with different processes:

1. **Spec changes require an RFC** with a minimum 7-day review period.
2. **Implementation changes** follow standard pull request review (2 approvers minimum).
3. **Spec version** is independent of package version. It follows its own semantic versioning (`MAJOR.MINOR.PATCH-stage`).
4. All spec documents MUST be marked with a `**Status:**` banner (`DRAFT`, `STABLE`, `DEPRECATED`).

## Rationale

This decision is motivated by the following observations:

- **Interoperability:** Multiple implementations (e.g., a Python AKCP compiler, a Rust reader) will need a stable contract. Tying the spec to the TypeScript package version creates confusion and fragility.
- **Ecosystem trust:** A stable, separately-versioned spec signals intent to be an open standard, not a vendor-specific format.
- **Avoiding premature standardization:** Marking specs as `DRAFT` explicitly signals to implementors that the format may change while the project matures.

## Consequences

- A `docs/specs/README.md` index is maintained, tracking the status and version of each spec document.
- The conformance test suite (`packages/conformance`) MUST reference spec section identifiers (e.g., `IR-1`, `BUILD-1`) in test descriptions.
- Any PR touching `docs/specs/` MUST reference the corresponding RFC (once the project has active external implementors; the RFC requirement is waived for the initial population of the spec while in DRAFT status).

## Alternatives Considered

- **Embedding spec in package READMEs:** Rejected. This ties spec evolution to release cycles and makes it harder for non-TypeScript implementations.
- **Using an external standards body immediately:** Rejected. Premature. The spec should stabilize before seeking formal standardization.
