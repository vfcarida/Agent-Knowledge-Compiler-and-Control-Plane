# AKCP CLI Command Inventory

This document maps the currently implemented commands in `packages/cli/src/index.ts` against their public documentation status to ensure the surface is honest and aligned.

| Implemented Command     | Documented in `docs/specs/cli.md`? | Mentioned in README? | Status | Notes                                                         |
| ----------------------- | :--------------------------------: | :------------------: | ------ | ------------------------------------------------------------- |
| `akcp quickstart`       |                Yes                 |         Yes          | Stable | Bootstrap, compile, and launch Control Plane in one command.  |
| `akcp init`             |                Yes                 |         Yes          | Stable | Initializes `.agent-context`.                                 |
| `akcp validate`         |                Yes                 |         Yes          | Beta   | Offline schema validation.                                    |
| `akcp scan`             |                Yes                 |          No          | Beta   | Analyzes raw repo and suggests OKF template mapping.          |
| `akcp compile`          |                Yes                 |         Yes          | Beta   | Compiles AK-IR and targets.                                   |
| `akcp inspect`          |                Yes                 |          No          | Beta   | Inspects compilation manifests (formerly `inspect-artifact`). |
| `akcp verify`           |                Yes                 |         Yes          | Stable | Verifies cryptographic manifest provenance/integrity.         |
| `akcp diff`             |                Yes                 |         Yes          | Stable | Computes semantic, policy, and Git revision diffs.            |
| `akcp import`           |                Yes                 |          No          | Beta   | Imports from external sources (e.g., OpenWiki).               |
| `akcp serve mcp`        |                Yes                 |         Yes          | Stable | Boots MCP Profile Server or Automation Server.                |
| `akcp serve automation` |                Yes                 |         Yes          | Stable | Boots MCP Automation Server directly with HITL gates.         |
| `akcp serve dashboard`  |                Yes                 |         Yes          | Stable | Launch the AKCP Control Plane Dashboard locally.              |
| `akcp control-plane`    |                Yes                 |         Yes          | Stable | Inspect runtime governance, policies, approvals, and audit.   |
| `akcp evals`            |                Yes                 |         Yes          | Stable | Run prompt-injection, retrieval-grounding, and bundle evals.  |
| `akcp docs`             |                Yes                 |          No          | Stable | Manage and diagnose repository documentation.                 |
| `akcp doctor`           |                Yes                 |         Yes          | Stable | Diagnoses environment.                                        |
| `akcp agents sync`      |                Yes                 |          No          | Stable | Syncs managed context block in `AGENTS.md`.                   |
| `akcp config validate`  |                Yes                 |          No          | Stable | Validates `akcp.yaml`.                                        |
| `akcp policy validate`  |                Yes                 |         Yes          | Stable | Validates machine-readable Policy Cards.                      |
| `akcp policy explain`   |                Yes                 |         Yes          | Stable | Explains Policy Cards and traces requests.                    |
| `akcp policy lint`      |                Yes                 |         Yes          | Stable | Detects shadowed, contradictory, and redundant policy rules.  |
| `akcp plan`             |                Yes                 |          No          | Stable | Generates an execution plan for compile.                      |
| `akcp reconcile`        |                Yes                 |          No          | Stable | Reconciles state (dry-run by default).                        |
| `akcp graph build`      |                Yes                 |         Yes          | Stable | Builds Knowledge Graph.                                       |
| `akcp graph inspect`    |                Yes                 |         Yes          | Stable | Inspects concepts in graph.                                   |
| `akcp graph impacted`   |                Yes                 |         Yes          | Stable | Finds downstream impacted artifacts via BFS traversal.        |
| `akcp context plan`     |                Yes                 |         Yes          | Stable | Generates a token-budget economics context report.            |
| `akcp lifecycle report` |                Yes                 |         Yes          | Stable | Reports on document freshness and TTL expiration.             |
| `akcp conformance run`  |                Yes                 |         Yes          | Stable | Runs the AKCP conformance suite.                              |
| `akcp scorecard`        |                Yes                 |         Yes          | Stable | Calculate Agent Knowledge Readiness Scorecard.                |
| `akcp plugin`           |                Yes                 |          No          | Stable | Manage AKCP build-time plugins.                               |
| `akcp privacy`          |                Yes                 |         Yes          | Stable | Manage PII redaction and privacy compliance.                  |
| `akcp completion`       |                Yes                 |          No          | Stable | Generate shell autocompletion script.                         |

## Core Commands (Stable/Beta)

### `akcp quickstart`

**Status**: Stable

Zero-to-Control-Plane command that bootstraps a knowledge bundle from a chosen template, runs compiler pipeline, emits runtime IR & control-plane metadata, and launches the interactive dashboard.

```bash
akcp quickstart [directory] [options]
```

**Options:**

```
-t, --template <name>     Template domain (e.g. it-operations, career, customer-support) (default: "it-operations")
-p, --port <number>       Port to bind the dashboard server to (default: "3001")
--host <host>             Host address to bind (default: "localhost")
-o, --open                Automatically open dashboard in default browser (default: true)
--no-open                 Do not automatically open browser
--no-serve                Only bootstrap and compile without starting the server
-h, --help                display help for command
```

### `akcp init`

**Status**: Stable

Initialize a new .agent-context structure

```bash
akcp init [options] [directory]
```

**Options:**

```
-t, --template <profile>  Context profile template (e.g., career, it-ops, customer-support) (default: "career")
-p, --profile <profile>   Context profile (deprecated, use --template)
-o, --output <dir>        Output directory for the bundle (overrides positional directory)
-i, --interactive         Run interactive setup wizard to configure template, destination, and autonomy (default: false)
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
policy-bundle, graph-json, okf-bundle, hybrid-index) (default: "all")
--provenance          Enable full cryptographic provenance tracking (default:
false)
--strict              Treat compiler and policy warnings as errors (exit non-zero)
--force               Bypass the incremental-build cache and force recompilation
--sign-key <path>     Path to Ed25519 private key PEM file to sign the provenance manifest
-w, --watch           Watch OKF source directories and incrementally recompile impacted concepts
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

### `akcp sign`

**Status**: Stable

Cryptographically sign a compiled bundle provenance manifest with Ed25519 (in-toto ITE-6)

```bash
akcp sign [options] [manifest]
```

**Options:**

```
-k, --private-key <path>       Path to Ed25519 private key PEM file
--generate-keys <directory>    Generate a new Ed25519 keypair (akcp-signing.key and akcp-signing.pub)
-f, --format <format>          Output format (text, json) (default: "text")
-h, --help                     display help for command
```

### `akcp verify`

**Status**: Stable

Verify the cryptographic provenance, file hashes, and optional Ed25519 attestation of a compiled bundle

```bash
akcp verify [options] <manifest>
```

**Options:**

```
-p, --public-key <path>   Path to Ed25519 public key PEM file to verify signed in-toto attestation
-a, --attestation <path>  Explicit path to .attestation.json file
-f, --format <format>     Output format (text, json) (default: "text")
-h, --help                display help for command
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

**Status**: Stable

Show semantic, governance, and capability differences between two bundles, builds, or Git revisions.

```bash
akcp diff [options] [base] [target]
```

**Options:**

```
-f, --format <type>       Output format: text, json, markdown (default: "text")
-o, --output <path>       Write diff report to specified file
--strict                  Exit with code 1 if any breaking changes are detected
--fail-on-breaking        Exit with code 1 if any breaking changes are detected
--from-git <rev>          Compare against a bundle snapshot from a specific Git revision (e.g. HEAD, main)
--to-git <rev>            Compare target against a specific Git revision instead of working tree
-h, --help                display help for command
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

## Server Commands (Beta)

### `akcp serve mcp`

**Status**: Beta

Locally boot the MCP Profile Server or Automation Server for this context.

```bash
akcp serve mcp [options]
```

**Options:**

```
-s, --server <server>     MCP server type to boot: profile | automation (default: "profile")
-p, --profile <profile>   Profile context to serve (default: "career")
--ir <path>               Path to compiled Knowledge IR json (default: "dist/agent-knowledge-ir.json")
--transport <type>        Transport: stdio | streamable-http | sse (deprecated) (default: "stdio")
--insecure-no-auth        Allow remote transport without authentication (dev only)
-h, --help                display help for command
```

### `akcp serve automation`

**Status**: Beta

Locally boot the MCP Automation Server with stateful Human-In-The-Loop (HITL) approval gates and dynamic capability dispatch.

```bash
akcp serve automation [options]
```

**Options:**

```
-p, --profile <profile>   Profile context to serve (default: "career")
--ir <path>               Path to compiled Knowledge IR json (default: "dist/agent-knowledge-ir.json")
--transport <type>        Transport: stdio | streamable-http | sse (deprecated) (default: "stdio")
--insecure-no-auth        Allow remote transport without authentication (dev only)
-h, --help                display help for command
```

### `akcp serve dashboard`

**Status**: Beta

Launch the AKCP Control Plane Dashboard locally, providing a web UI to view compiled knowledge graphs, inspect MCP capabilities, review audit trails, and manage pending HITL approvals.

```bash
akcp serve dashboard [options]
```

**Options:**

```
-p, --port <number>       Port to bind the dashboard server to (default: "3001")
--host <host>             Host address to bind (default: "localhost")
--ir <path>               Path to compiled Knowledge IR json (default: "dist/agent-knowledge-ir.json")
--bundle <path>           Path to OKF knowledge bundle directory
--demo                    Enable demo mode with mock data (default)
--no-demo                 Disable demo mode, require live control plane
-o, --open                Automatically open dashboard in default browser (default: true)
--no-open                 Do not automatically open browser
-h, --help                display help for command
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

**Status**: Stable

Manage evaluation datasets and run evaluation scenarios (`prompt-injection`, `retrieval-grounding`, or full bundle evaluation suites).

```bash
akcp evals [options] [command]
```

**Options:**

```
--scenario <name>  Specific scenario to run (prompt-injection, retrieval-grounding)
--report           Generate a detailed evaluation report
-h, --help         display help for command
```

### `akcp docs`

**Status**: Stable

Manage and diagnose repository documentation

```bash
akcp docs [options] [command]
```

**Options:**

```
-h, --help      display help for command
```

### `akcp agents sync`

**Status**: Stable

Synchronize the managed context block within agent instruction files

```bash
akcp agents sync [options]
```

**Options:**

```
-h, --help  display help for command
```

### `akcp plan`

**Status**: Stable

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

**Status**: Stable

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

**Status**: Stable

Manage AKCP build-time plugins (`akcp plugin list`)

```bash
akcp plugin [options] [command]
```

**Options:**

```
-h, --help            display help for command
```

### `akcp privacy`

**Status**: Stable

Manage PII redaction and privacy compliance (`akcp privacy scan`)

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

**Status**: Stable

Explain a PolicyCard in human-readable text and optionally trace a simulated request

```bash
akcp policy explain [options] <file>
```

**Options:**

```
--request <json>  Simulated request as JSON (tool, agentId, riskLevel, scopes)
--verbose         Show all evaluated rules
-h, --help        display help for command
```

### `akcp policy lint`

**Status**: Stable

Analyze PolicyCard files or directories for shadowed, contradictory, or redundant rules

```bash
akcp policy lint [options] [target]
```

**Options:**

```
-f, --format <format>  Output format (text, json) (default: "text")
--strict               Treat lint warnings as errors
-h, --help             display help for command
```

### `akcp conformance run`

**Status**: Stable

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

## Knowledge Graph (Stable)

### `akcp graph build`

**Status**: Stable

Build the knowledge graph from the OKF bundle

```bash
akcp graph build [options]
```

**Options:**

```
--bundle <directory>  Directory containing akcp.yaml or okf bundle (default: ".")
-o, --out <path>      Output path for graph JSON (default: "dist/akcp/graph.json")
-h, --help            display help for command
```

### `akcp graph inspect`

**Status**: Stable

Inspect a concept or summary in the knowledge graph

```bash
akcp graph inspect [options]
```

**Options:**

```
-c, --concept <id>    Concept ID to inspect
-g, --graph <path>    Path to graph JSON (default: "dist/akcp/graph.json")
--bundle <directory>  Bundle directory containing dist/akcp/graph.json
-h, --help            display help for command
```

### `akcp graph impacted`

**Status**: Stable

List all downstream concepts impacted by a change to a concept

```bash
akcp graph impacted [options] [conceptId]
```

**Options:**

```
-c, --concept <id>    Concept ID to analyze
-g, --graph <path>    Path to graph JSON (default: "dist/akcp/graph.json")
--bundle <directory>  Bundle directory containing dist/akcp/graph.json
-f, --format <format> Output format (text, json) (default: "text")
-h, --help            display help for command
```

## Context & Economics (Stable)

### `akcp context plan`

**Status**: Stable

Simulate context packing and generate a token-budget economics report

```bash
akcp context plan [options]
```

**Options:**

```
-t, --task <task>         Task description for relevance scoring (default: "general task")
-b, --budget <tokens>     Maximum tokens allowed in the budget (default: "10000")
-p, --profile <profile>   Profile schema to load (default: "career")
-c, --config <path>       Path to akcp.yaml or bundle directory
--bundle <directory>      Directory containing akcp.yaml
-f, --format <format>     Output format (text, json) (default: "text")
-h, --help                display help for command
```

### `akcp lifecycle report`

**Status**: Stable

Generate a lifecycle freshness report (active, stale, deprecated)

```bash
akcp lifecycle report [options]
```

**Options:**

```
-c, --config <path>    Path to akcp.yaml or bundle directory
-b, --bundle <dir>     Directory containing akcp.yaml
-f, --format <format>  Output format (text, json) (default: "text")
-h, --help             display help for command
```

### `akcp scorecard`

**Status**: Stable

Calculate Agent Knowledge Readiness Scorecard

```bash
akcp scorecard [options]
```

**Options:**

```
-b, --bundle <directory>  Path to the context bundle
-f, --format <format>     Output format (json or markdown) (default: "markdown")
-h, --help                display help for command
```
