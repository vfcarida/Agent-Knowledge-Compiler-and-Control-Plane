# Specification: AKCP CLI (`akcp`)

## Overview

The `akcp` CLI is the operational entry point for the Agent Knowledge Compiler and Control Plane (AKCP). It transforms standard directories into governed, agent-readable Open Knowledge Format (OKF) bundles, compiles them into Agent Knowledge IR (AK-IR), and exposes them securely via the Model Context Protocol (MCP).

It is designed to be fully functional without an LLM (relying purely on strict schemas), but can optionally orchestrate LLMs to assist in translating unstructured knowledge into structured context packs via `akcp scan`.

## Core Principles

- **Idempotent Operations:** Commands like `init` and `compile` can be safely run multiple times without destructive effects.
- **Dry-Run by Default:** Any command that writes or modifies user files must support `--dry-run` or be dry-run by default (like `akcp reconcile`).
- **Consent-Driven Context Injection:** The CLI can inject context boundaries into `AGENTS.md` or `CLAUDE.md` via `akcp agents sync`, but requires explicit execution.
- **CI/CD Native:** Supports output formats for integration with CI pipelines (e.g., manifest generation and verification).

## Commands

See [docs/reference/cli.md](../reference/cli.md) for a complete list of all 22 implemented commands. Below are the core operational commands defined by this specification.

### `init [directory]`

Initializes a new context pack.

- Creates the base `.okf` or `.agent-context` hidden directory.
- Bootstraps an `index.md` entrypoint.
- Generates a local `AGENTS.md` context injection file.
- **Flags:**
  - `--profile <software|career|enterprise|custom>` (Defaults to standard OKF base).

### `scan [directory]`

Analyzes an existing unstructured repository and suggests an OKF mapping layout.

- If `--model-provider` is set, uses an LLM to categorize raw documents into structured `type: *` outputs.
- **Flags:**
  - `--model-provider <none|openai|anthropic|openrouter|local>`
  - `--output <path>`
  - `--dry-run`

### `compile`

Compiles and serializes the context pack, ensuring all frontmatter is valid, inter-document ID references resolve, and targets (like `ir-json` or `graph-json`) are generated.

- **Flags:**
  - `--bundle <directory>`
  - `--target <type>`
  - `--provenance`

### `validate [directory]`

Performs a strict, offline schema validation.

- Checks that all `.md` files contain valid YAML frontmatter.
- Asserts that `type` fields conform to the OKF base spec or the configured profile.
- **Flags:**
  - `--format <json|markdown>`
  - `--profile <profile>`

### `diff [directory]`

Displays semantic context changes since the last `compile`. Useful for determining if a Context Pack update requires re-triggering Evals.

### `serve mcp [directory]`

Locally boots the MCP Profile Server mapping the targeted context bundle.

- Instantly connects to Claude Desktop or other MCP clients.
- Binds standard `read_document`, `list_documents`, and `build_context_pack` tools to the bundle.

### `doctor`

Diagnostics tool to verify environment readiness.

- Checks Node.js version.
- Validates workspace lockfiles.

## Usage Example (The "Happy Path")

```bash
# 1. Initialize a new software engineering context pack
pnpm akcp init ./my-project --profile software

# 2. Add raw documents and let the CLI structure them (Dry run first)
pnpm akcp scan ./my-project/docs --dry-run

# 3. Validate the manually authored schemas
pnpm akcp validate ./my-project/.agent-context

# 4. Compile the final bundle into AK-IR
pnpm akcp compile --bundle ./my-project/.agent-context

# 5. Serve directly to your agent IDE
pnpm akcp serve mcp ./my-project/.agent-context
```
