# Specification Governance

AKCP is both a reference implementation (the code in this repository) and a set of specifications for how knowledge should be compiled and controlled for AI agents. This document defines what is normative and how specifications are governed.

## Normative vs Reference Implementation

### Normative Specifications
The following parts of AKCP are **normative**. Any third-party system claiming AKCP compatibility must implement them exactly as defined:
1. **Agent Knowledge Intermediate Representation (AK-IR):** The structure, schema, and linking rules of the IR.
2. **`akcp.yaml` Configuration:** The fields, defaults, and resolution logic for the compiler config.
3. **Policy Cards (`policy.yaml`):** The schema defining capability bounds, risk levels, and approval required rules.
4. **Conformance Definitions:** The four tiers of conformance and what constitutes a pass/fail.

### Reference Implementations
The following parts are **reference implementations** and can be freely swapped or modified by end users:
1. **The `akcp` CLI:** You can write your own compiler runner using `@akcp/core` directly.
2. **The MCP Servers:** You can implement your own MCP gateway; ours is just a provided default.
3. **The Operator Dashboard:** The UI is purely for demonstration and operator convenience.

## Spec Versioning

Normative specifications follow their own versioning distinct from the NPM package version.
Specs are versioned as `vX.Y`:
- **Major (v1, v2):** Breaking changes to the core schemas. A valid v1 bundle might not compile under a v2 compiler.
- **Minor (v1.1, v1.2):** Non-breaking additions. A valid v1 bundle will still compile cleanly under a v1.1 compiler.

Changes to the normative specs MUST go through the [RFC Process](rfc-process.md).
