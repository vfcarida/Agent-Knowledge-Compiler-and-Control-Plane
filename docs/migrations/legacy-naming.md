# Legacy Naming & Identity Migration

This document records the historical names of the project and quarantines legacy terms for archival purposes.

## Historical Names
During its early development, this project evolved through several conceptual identities and naming conventions before settling on **Agent Knowledge Compiler and Control Plane (AKCP)**.

You may find historical references to the following terms in older commits, issues, and discussions:
- **Open Career Format Orchestrator (OCF Orchestrator)**: The initial thesis of the project was heavily focused on the *Career* domain, orchestrating resumes, skill sets, and job data (which is now just one domain flagship example).
- **ContextOps**: A conceptual category name used to describe the operations of context management.
- **Agent-ready Knowledge Reference Architecture**: An early descriptive name for the architecture.
- **@ocf**: The legacy NPM package scope for internal packages (e.g., `@ocf/core`), which has since been migrated to `@akcp/*`.

## Allowed Exceptions
The following references are permitted to exist in the codebase despite the migration to AKCP:
1. **The Career Domain Flagship**: The directory `examples/domains/career/` and `sample-data/.okf/` contain examples specific to the Career domain. Terms like "career data management" are allowed *only* when specifically describing this domain data, not the orchestrator itself.
2. **Open Knowledge Format (OKF)**: OKF is a separate, external standard. References to OKF (such as `.okf` bundles or the OKF specification) remain valid and must not be replaced with AKCP.
3. **Legacy CLI Shim**: The file `packages/cli/src/legacy-ocf-bin.ts` exists to provide a deprecation warning and backward compatibility for users running the old `ocf` binary alias. The string `ocf` is allowed within this specific implementation context.

All other files (docs, package definitions, READMEs, tests, and comments) must use the standard public identity: **Agent Knowledge Compiler and Control Plane (AKCP)**.
