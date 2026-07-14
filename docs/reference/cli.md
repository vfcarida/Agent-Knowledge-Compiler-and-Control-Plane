# AKCP CLI Command Inventory

This document maps the currently implemented commands in `packages/cli/src/index.ts` against their public documentation status to ensure the surface is honest and aligned.

| Implemented Command     | Documented in `docs/specs/cli.md`? | Mentioned in README? | Status       | Notes                                                       |
| ----------------------- | :--------------------------------: | :------------------: | ------------ | ----------------------------------------------------------- |
| `akcp init`             |                Yes                 |         Yes          | Stable       | Initializes `.agent-context`.                               |
| `akcp validate`         |                Yes                 |         Yes          | Beta         | Offline schema validation.                                  |
| `akcp scan`             |                Yes                 |          No          | Beta         | Analyzes raw repo and suggests OKF template mapping.        |
| `akcp compile`          |          Yes (as `build`)          |          No          | Beta         | Formerly documented as `build`. Compiles AK-IR and targets. |
| `akcp inspect-artifact` |                 No                 |          No          | Beta         | Inspects compilation manifests.                             |
| `akcp verify`           |                 No                 |          No          | Beta         | Verifies manifest provenance/integrity.                     |
| `akcp diff`             |                Yes                 |          No          | Planned      | Skeleton exists but just outputs hardcoded text.            |
| `akcp import`           |                 No                 |          No          | Alpha        | Imports from external sources (e.g., OpenWiki).             |
| `akcp serve:mcp`        |                Yes                 |         Yes          | Experimental | Boots MCP Profile Server.                                   |
| `akcp doctor`           |                Yes                 |         Yes          | Stable       | Diagnoses environment.                                      |
| `akcp agents sync`      |                 No                 |          No          | Beta         | Syncs managed context block in `AGENTS.md`.                 |
| `akcp config validate`  |                 No                 |          No          | Beta         | Validates `akcp.yaml`.                                      |
| `akcp policy validate`  |                 No                 |          No          | Beta         | Validates machine-readable Policy Cards.                    |
| `akcp policy explain`   |                 No                 |          No          | Beta         | Explains Policy Cards in human text.                        |
| `akcp plan`             |                 No                 |          No          | Beta         | Generates an execution plan for compile.                    |
| `akcp reconcile`        |                 No                 |          No          | Beta         | Reconciles state (dry-run by default).                      |
| `akcp graph build`      |                 No                 |          No          | Beta         | Builds Knowledge Graph.                                     |
| `akcp graph inspect`    |                 No                 |          No          | Beta         | Inspects concepts in graph.                                 |
| `akcp graph impacted`   |                 No                 |          No          | Beta         | Finds downstream impacted artifacts.                        |
| `akcp context plan`     |                 No                 |          No          | Beta         | Generates an economics context report.                      |
| `akcp lifecycle report` |                 No                 |          No          | Beta         | Reports on document freshness.                              |
| `akcp conformance run`  |                 No                 |          No          | Beta         | Runs the AKCP conformance suite.                            |

## Action Items for Coherence

- Rename references of `build` to `compile` in documentation to match code.
- Add missing commands to a new `docs/cli/usage.md` file.
- Ensure the `README.md` reflects this exact status.
