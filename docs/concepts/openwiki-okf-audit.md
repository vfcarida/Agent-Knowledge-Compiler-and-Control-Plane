# OpenWiki & OKF Integration Audit

## Assessment of Existing Integration

This document audits the baseline state of AKCP integrations with OpenWiki and OKF prior to the 1.0 integration architectural overhaul.

| Capability                  | Exists? | Quality | Gap                                                                                                      | Required change                                                                                    |
| --------------------------- | :-----: | ------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| OpenWiki Source Import      |   Yes   | Basic   | Implemented a simplistic `OpenWikiConnector` that reads `.md` files directly without structural mapping. | Adopt `SourceAdapter` pattern (detect, scan, normalize, preserve provenance).                      |
| OKF Directory Source Import |   Yes   | Good    | Native `OkfDirectoryConnector` exists, but needs robustness.                                             | Tolerance for unknown types/keys, and robust error/warning logging via diagnostics.                |
| Provenance Tracking         | Partial | Basic   | Manifest is built tracking `contentHash`, but source records are lost during simplistic import.          | Add `ProvenanceRecord` capturing `sourceUri`, `sourceHash`, `importedAt`, and adapter metadata.    |
| Incremental Compilation     |   No    | None    | All sources are fully processed and recompiled on every run.                                             | Introduce `build-state.json` cache to map `sourceHash -> artifactHash` and skip unmodified inputs. |
| Explicit Target Mapping     | Partial | Medium  | Target plugins exist, but CLI options and `akcp compile --target` usage lack precise 1:1 mappings.       | Formalize the `akcp compile` target enumerations and outputs.                                      |

## Strategy Going Forward

- The integration will pivot from "simple file readers" to full **Source Adapters**.
- OpenWiki will be treated as an upstream authoring source, whose output is normalized into OKF.
- OKF will serve as the robust, standardized input for the AKCP pipeline.
- AKCP will act exclusively as the **Compiler and Control Plane**, optimizing, indexing, and validating context packs for Agent runtimes via MCP.
