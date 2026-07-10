# Specification: AKCP CLI (`akcp`)

## Overview
The `akcp` CLI is the operational entry point for AKCP. It transforms standard directories into governed, agent-readable Open Knowledge Format (OKF) bundles and exposes them securely via the Model Context Protocol (MCP).

It is designed to be fully functional without an LLM (relying purely on strict schemas), but can optionally orchestrate LLMs to assist in translating unstructured knowledge into structured context packs.

## Core Principles
- **Idempotent Operations:** Commands like `init` and `build` can be safely run multiple times without destructive effects.
- **Dry-Run by Default:** Any command that writes or modifies user files must support `--dry-run`.
- **Consent-Driven Context Injection:** The CLI can inject context boundaries into `AGENTS.md` or `CLAUDE.md`, but requires explicit confirmation.
- **CI/CD Native:** Supports `--format json` output on validation for integration with GitHub Actions.

## Commands

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

### `build [directory]`
Compiles and serializes the context pack, ensuring all frontmatter is valid and inter-document ID references resolve.
- **Flags:** 
  - `--dry-run`

### `validate [directory]`
Performs a strict, offline schema validation.
- Checks that all `.md` files contain valid YAML frontmatter.
- Asserts that `type` fields conform to the OKF base spec or the configured profile.
- **Flags:**
  - `--format <json|markdown>`

### `diff [directory]`
Displays semantic context changes since the last `build`. Useful for determining if a Context Pack update requires re-triggering Evals.

### `serve:mcp [directory]`
Locally boots the MCP Profile Server mapping the targeted context bundle.
- Instantly connects to Claude Desktop or other MCP clients.
- Binds standard `read_document`, `list_documents`, and `search` JSON-RPC tools to the bundle.

### `doctor`
Diagnostics tool to verify environment readiness.
- Checks Node.js version.
- Validates workspace lockfiles.
- Checks if MCP Clients (e.g., Claude Desktop config) are correctly tracking the CLI's paths.

## Usage Example (The "Happy Path")
```bash
# 1. Initialize a new software engineering context pack
npx akcp init ./my-project --profile software

# 2. Add raw documents and let the CLI structure them (Dry run first)
npx akcp scan ./my-project/docs --model-provider openai --dry-run

# 3. Validate the manually authored schemas
npx akcp validate ./my-project/.agent-context

# 4. Build the final bundle index
npx akcp build ./my-project/.agent-context

# 5. Serve directly to your agent IDE
npx akcp serve:mcp ./my-project/.agent-context
```
