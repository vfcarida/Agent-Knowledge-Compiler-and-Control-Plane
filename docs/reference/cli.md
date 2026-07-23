# AKCP CLI Command Inventory

This document maps the currently implemented commands in `packages/cli/src/index.ts` against their public documentation status to ensure the surface is honest and aligned.

| Implemented Command     | Documented in `docs/specs/cli.md`? | Mentioned in README? | Status       | Notes                                                          |
| ----------------------- | :--------------------------------: | :------------------: | ------------ | -------------------------------------------------------------- |
| `akcp init`             |                Yes                 |         Yes          | Stable       | Initializes `.agent-context`.                                  |
| `akcp validate`         |                Yes                 |         Yes          | Beta         | Offline schema validation.                                     |
| `akcp scan`             |                Yes                 |          No          | Beta         | Analyzes raw repo and suggests OKF template mapping.           |
| `akcp compile`          |                Yes                 |         Yes          | Beta         | Compiles AK-IR and targets.                                    |
| `akcp inspect`          |                Yes                 |          No          | Beta         | Inspects compilation manifests (formerly `inspect-artifact`).  |
| `akcp verify`           |                 No                 |          No          | Beta         | Verifies manifest provenance/integrity.                        |
| `akcp diff`             |                Yes                 |          No          | Planned      | [Stub] Skeleton exists but just outputs hardcoded text.        |
| `akcp import`           |                 No                 |          No          | Alpha        | [Experimental] Imports from external sources (e.g., OpenWiki). |
| `akcp serve mcp`        |                Yes                 |         Yes          | Experimental | [Experimental] Boots MCP Profile Server.                       |
| `akcp serve dashboard`  |                 No                 |          No          | Experimental | [Experimental] Launch the Dashboard locally.                   |
| `akcp control-plane`    |                 No                 |          No          | Experimental | [Experimental] Manage runtime governance/HITL.                 |
| `akcp evals`            |                 No                 |          No          | Beta         | Manage evaluation datasets and runs.                           |
| `akcp docs`             |                 No                 |          No          | Beta         | Manage and diagnose repository documentation.                  |
| `akcp doctor`           |                Yes                 |         Yes          | Stable       | Diagnoses environment.                                         |
| `akcp agents sync`      |                 No                 |          No          | Beta         | Syncs managed context block in `AGENTS.md`.                    |
| `akcp config validate`  |                 No                 |          No          | Beta         | Validates `akcp.yaml`.                                         |
| `akcp policy validate`  |                 No                 |          No          | Beta         | Validates machine-readable Policy Cards.                       |
| `akcp policy explain`   |                 No                 |          No          | Beta         | Explains Policy Cards in human text.                           |
| `akcp plan`             |                 No                 |          No          | Beta         | Generates an execution plan for compile.                       |
| `akcp reconcile`        |                 No                 |          No          | Beta         | Reconciles state (dry-run by default).                         |
| `akcp graph build`      |                 No                 |          No          | Beta         | Builds Knowledge Graph.                                        |
| `akcp graph inspect`    |                 No                 |          No          | Beta         | Inspects concepts in graph.                                    |
| `akcp graph impacted`   |                 No                 |          No          | Beta         | Finds downstream impacted artifacts.                           |
| `akcp context plan`     |                 No                 |          No          | Beta         | Generates an economics context report.                         |
| `akcp lifecycle report` |                 No                 |          No          | Beta         | Reports on document freshness.                                 |
| `akcp conformance run`  |                 No                 |          No          | Beta         | Runs the AKCP conformance suite.                               |
| `akcp scorecard`        |                 No                 |          No          | Beta         | Calculate Agent Knowledge Readiness Scorecard.                 |
| `akcp plugin`           |                 No                 |          No          | Beta         | Manage AKCP build-time plugins.                                |
| `akcp privacy`          |                 No                 |          No          | Beta         | Manage PII redaction and privacy compliance.                   |
| `akcp completion`       |                 No                 |          No          | Beta         | Generate shell autocompletion script.                          |

## Core Commands (Stable/Beta)

### `akcp init`

**Status**: Stable

Initialize a new .agent-context structure

```bash
akcp init [options] [directory]
```

**Options:**

```
-t, --template <profile>  Context profile template (e.g., career, it-ops)
(default: "career")
-p, --profile <profile>   Context profile (deprecated, use --template)
-o, --output <dir>        Output directory for the bundle (overrides
positional directory)
-h, --help                display help for command
```

### `akcp validate`

**Status**: Beta

Strict offline schema validation of an OKF/Context bundle

```bash
akcp validate [options] [directory]
```

**Options:**

```
-f, --format <format>     Output format (json or markdown) (default:
"markdown")
-b, --bundle <directory>  Directory to validate (overrides positional
argument)
-p, --profile <profile>   Profile to validate against (default: "career")
-h, --help                display help for command
```

### `akcp scan`

**Status**: Beta

Analyze repository and suggest context document structures

```bash
akcp scan [options] [directory]
```

**Options:**

```
--dry-run           Do not write files, just show what would be suggested
-o, --output <dir>  Output directory for context pack (default:
".agent-context")
-h, --help          display help for command
```

### `akcp compile`

**Status**: Beta

Compile Context Packs to specified targets

```bash
akcp compile [options]
```

**Options:**

```
-c, --config <path>   Path to akcp.yaml or directory containing it
--bundle <directory>  Directory containing akcp.yaml (deprecated, use
--config)
--target <type>       Specific target to compile (e.g., all, mcp-resources,
mcp-tools, mcp-prompts, context-pack, openwiki,
agent-instructions, eval-dataset, dashboard-metadata,
policy-bundle) (default: "all")
--provenance          Enable full cryptographic provenance tracking (default:
false)
-h, --help            display help for command
```

### `akcp inspect`

**Status**: Beta

Inspect an AKCP compile manifest

```bash
akcp inspect [options]
```

**Options:**

```
--artifact <path>  Path to akcp-manifest.json
-h, --help         display help for command
```

### `akcp verify`

**Status**: Beta

Verify the cryptographic provenance and integrity of a compiled bundle

```bash
akcp verify [options] <manifest>
```

**Options:**

```
-h, --help  display help for command
```

### `akcp doctor`

**Status**: Stable

Diagnose environment configuration and readiness

```bash
akcp doctor [options]
```

**Options:**

```
-h, --help  display help for command
```

### `akcp diff`

**Status**: Planned

Not yet implemented. Returns NOT_IMPLEMENTED error.

[Planned] Show semantic context changes since last build

```bash
akcp diff [options] [directory]
```

**Options:**

```
-h, --help  display help for command
```

### `akcp config validate`

**Status**: Beta

Validate akcp.yaml configuration

```bash
akcp config validate [options]
```

**Options:**

```
-f, --file <path>  Path to akcp.yaml (default: "akcp.yaml")
-h, --help         display help for command
```

## Server Commands (Experimental)

### `akcp serve mcp`

**Status**: Experimental

> This command is experimental. API may change without notice.

[Experimental] Locally boot the MCP Profile Server for this context

```bash
akcp serve mcp [options]
```

**Options:**

```
-p, --profile <profile>  Profile context to serve (default: "career")
--ir <path>              Path to compiled Knowledge IR json (default:
"dist/knowledge-ir.json")
-h, --help               display help for command
```

### `akcp serve dashboard`

**Status**: Experimental

> This command is experimental. API may change without notice.

[Planned] Launch the Dashboard locally

```bash
akcp serve dashboard [options]
```

**Options:**

```
-h, --help  display help for command
```

### `akcp control-plane`

**Status**: Experimental

> This command is experimental. API may change without notice.

[Experimental] Manage runtime governance, policies, and HITL approvals

```bash
akcp control-plane [options] [command]
```

**Options:**

```
-h, --help      display help for command
```

## Utility Commands (Beta)

### `akcp import`

**Status**: Experimental

> This command is experimental. API may change without notice.

[Experimental] Import from external systems into a Context Pack

```bash
akcp import [options] <source>
```

**Options:**

```
-i, --input <dir>   Input directory (default: "openwiki")
-o, --output <dir>  Output directory for context pack (default: ".okf")
--dry-run           Do not write files, just show what would be generated
--force             Overwrite existing files without prompting
-h, --help          display help for command
```

### `akcp evals`

**Status**: Planned

Not yet implemented. Returns NOT_IMPLEMENTED error.

Manage evaluation datasets and runs

```bash
akcp evals [options] [command]
```

**Options:**

```
-h, --help      display help for command
```

### `akcp docs`

**Status**: Beta

Manage and diagnose repository documentation

```bash
akcp docs [options] [command]
```

**Options:**

```
-h, --help      display help for command
```

### `akcp agents sync`

**Status**: Beta

Synchronize the managed context block within agent instruction files

```bash
akcp agents sync [options]
```

**Options:**

```
-h, --help  display help for command
```

### `akcp plan`

**Status**: Planned

Not yet implemented. Returns NOT_IMPLEMENTED error.

Generate execution plan based on akcp.yaml

```bash
akcp plan [options]
```

**Options:**

```
-f, --file <path>  Path to akcp.yaml (default: "akcp.yaml")
-h, --help         display help for command
```

### `akcp reconcile`

**Status**: Planned

Not yet implemented. Returns NOT_IMPLEMENTED error.

Reconcile desired state with current environment

```bash
akcp reconcile [options]
```

**Options:**

```
-f, --file <path>  Path to akcp.yaml (default: "akcp.yaml")
--no-dry-run       Disable dry run and perform the actual changes
-h, --help         display help for command
```

### `akcp plugin`

**Status**: Planned

Not yet implemented. Returns NOT_IMPLEMENTED error.

Manage AKCP build-time plugins

```bash
akcp plugin [options] [command]
```

**Options:**

```
-h, --help            display help for command
```

### `akcp privacy`

**Status**: Planned

Not yet implemented. Returns NOT_IMPLEMENTED error.

Manage PII redaction and privacy compliance

```bash
akcp privacy [options] [command]
```

**Options:**

```
-h, --help        display help for command
```

### `akcp completion`

**Status**: Beta

Generate shell autocompletion script (bash or zsh)

```bash
akcp completion [options] <shell>
```

**Options:**

```
-h, --help  display help for command
```

## Governance Commands (Beta)

### `akcp policy validate`

**Status**: Beta

Validate a PolicyCard YAML file

```bash
akcp policy validate [options] <file>
```

**Options:**

```
-h, --help  display help for command
```

### `akcp policy explain`

**Status**: Beta

Explain a PolicyCard in human-readable text

```bash
akcp policy explain [options] <file>
```

**Options:**

```
-h, --help  display help for command
```

### `akcp conformance run`

**Status**: Beta

Run conformance suite on a target bundle

```bash
akcp conformance run [options]
```

**Options:**

```
-b, --bundle <directory>  Path to the context bundle
-p, --profile <profile>   AKCP profile to test against (default: "career")
-f, --format <format>     Output format (text or json) (default: "text")
-h, --help                display help for command
```

## Knowledge Graph (Beta)

### `akcp graph build`

**Status**: Beta

Build the knowledge graph from the OKF bundle

```bash
akcp graph build [options]
```

**Options:**

```
--bundle <directory>  Directory containing akcp.yaml or okf bundle (default:
".")
-h, --help            display help for command
```

### `akcp graph inspect`

**Status**: Beta

Inspect a concept in the knowledge graph

```bash
akcp graph inspect [options]
```

**Options:**

```
-c, --concept <id>  Concept ID to inspect
-h, --help          display help for command
```

### `akcp graph impacted`

**Status**: Planned

Not yet implemented. Returns NOT_IMPLEMENTED error.

List all downstream concepts impacted by a change to this concept

```bash
akcp graph impacted [options]
```

**Options:**

```
-c, --concept <id>  Concept ID to analyze
-h, --help          display help for command
```

## Context & Economics (Beta)

### `akcp context plan`

**Status**: Planned

Not yet implemented. Returns NOT_IMPLEMENTED error.

Simulate context packing and generate an economics report

```bash
akcp context plan [options]
```

**Options:**

```
-t, --task <task>        Task description for relevance scoring (default:
"general task")
-b, --budget <tokens>    Maximum tokens allowed in the budget (default:
"10000")
-p, --profile <profile>  Profile schema to load (default: "career")
-h, --help               display help for command
```

### `akcp lifecycle report`

**Status**: Planned

Not yet implemented. Returns NOT_IMPLEMENTED error.

Generate a lifecycle report (active, stale, deprecated)

```bash
akcp lifecycle report [options]
```

**Options:**

```
-h, --help  display help for command
```

### `akcp scorecard`

**Status**: Planned

Not yet implemented. Returns NOT_IMPLEMENTED error.

Calculate Agent Knowledge Readiness Scorecard

```bash
akcp scorecard [options]
```

**Options:**

```
-b, --bundle <directory>  Path to the context bundle
-f, --format <format>     Output format (json or markdown) (default:
"markdown")
-h, --help                display help for command
```

## Action Items for Coherence

- Rename references of `build` to `compile` in documentation to match code.

- Ensure the `README.md` reflects this exact status.
