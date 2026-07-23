# Compatibility Levels

The Open Knowledge Format (OKF) and Agent Knowledge Compiler and Control Plane (AKCP) define four distinct tiers of compatibility. These tiers allow external implementers to adopt the format incrementally while establishing clear boundaries of maturity.

## 1. OKF-compatible

The lowest level of certification. A bundle is OKF-compatible if it adheres to the base [OKF v0.1 Specification](https://raw.githubusercontent.com/GoogleCloudPlatform/knowledge-catalog/main/okf/SPEC.md).

**Requirements:**

- All knowledge is stored in UTF-8 Markdown files (`.md`).
- Each file begins with valid YAML frontmatter delimited by `---`.
- Every frontmatter block contains a `type: <string>` field.
- The bundle may optionally include an `index.md` and `log.md`.

## 2. AKCP-profile-compatible

This tier certifies that the bundle aligns with a domain-specific schema (an "Open Context Profile"). For example, the `career` profile.

**Requirements:**

- Must meet all `OKF-compatible` requirements.
- Frontmatter schemas match the domain expectations (e.g. `Application` documents contain `applicationStatus`, `url`, etc).
- Files pass strict validation (e.g., Zod validation) against the registered profile schemas.

## 3. AKCP-compiler-compatible

This tier guarantees that the bundle can be compiled into an Agent Knowledge Intermediate Representation (IR) without fatal errors, enabling graph operations and deterministic agent consumption.

**Requirements:**

- Must meet all `AKCP-profile-compatible` requirements.
- Cross-document links are semantically analyzable.
- The bundle compiles cleanly through `buildKnowledgeIR`.

## 4. AKCP-control-plane-compatible

The highest level of certification. The bundle is fully manageable by the Control Plane, featuring policy-as-code governance, target compilation, and zero-trust orchestration.

**Requirements:**

- Must meet all `AKCP-compiler-compatible` requirements.
- The bundle includes a well-formed `akcp.yaml` configuration.
- Any defined Policy Cards (e.g., access control, redaction rules) are structurally valid and evaluate cleanly.
- Target pipelines (e.g. OpenWiki Docs, MCP Server manifests) are cleanly defined and executable.
