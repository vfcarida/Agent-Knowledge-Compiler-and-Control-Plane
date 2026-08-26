# Compile Targets

The **Agent Knowledge Compiler and Control Plane (AKCP)** compiles raw, distributed organizational knowledge into multiple governed artifacts (targets) designed for consumption by AI agents and adjacent runtime systems.

## Configuration

In your `akcp.yaml` configuration file, declare the `targets` array inside the `compile` block:

```yaml
compile:
  sources:
    - type: okf-directory
      path: ./sources
  targets:
    - type: context-pack
      out: dist/agent-knowledge-ir.json
    - type: openwiki
      out: dist/openwiki
    - type: mcp-resources
      out: dist/mcp-resources.json
    - type: dashboard-metadata
      out: dist/dashboard-meta.json
```

## Available Targets

### `context-pack` (or `ir-json`)

The central normalized knowledge artifact of AKCP. Represents the entire extracted ontology (`IRConcept`s and `IRLink`s) in an AST-level structured JSON format, including metadata, tags, and context budgeting telemetry.

- **Consumers**: MCP Profile Server, Control Plane, Dashboard UI, CI pipeline.

### `okf-bundle`

Exports the normalized IR back into a clean, canonical folder of `.md` files with validated YAML frontmatter. Useful for consolidating mixed sources (such as raw Markdown, OpenAPI definitions, and OpenWiki exports) into a unified OKF v0.1.0 bundle.

### `openwiki`

Generates a hierarchical Markdown documentation tree with generated index and navigation files. Ideal for publishing clean documentation to developer portals (e.g. GitHub Pages) or straightforward file ingestion for non-MCP agents.

### `agent-instructions` (or `agents-md`)

Generates an optimized Markdown snippet suitable for embedding into `AGENTS.md` (or `CLAUDE.md`). Contains cryptographic signatures, bundle identity, and context pack inventory blocks.

### `mcp-resources`

Produces a Model Context Protocol resource manifest declaring the URI templates, MIME types, and document resources exposed by an MCP server based on the compiled knowledge.

### `policy-bundle`

Extracts and bundles governance constraints, Policy Cards, and capability rules from the IR for standalone authorization engines and runtime gateways.

### `eval-dataset`

Generates synthetic and extracted QA pairs (question/document grounding datasets) in JSONL format, ready for evaluation harnesses and NIST AI RMF compliance audits.

### `dashboard-metadata`

Extracts aggregate metrics, entity relationships, dependency graphs, and summary statistics consumed by the AKCP Dashboard BFF.

## Compilation Manifest

Whenever compilation is executed, a root build manifest named `akcp-manifest.json` is generated in the target directory. It contains the build identity, tool version, source configuration hashes, and cryptographic hashes (SHA-256) of every emitted target artifact for provenance verification.
