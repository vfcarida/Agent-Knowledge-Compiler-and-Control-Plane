# OpenWiki Interoperability

## The Strategy: Complementarity

**[OpenWiki](https://github.com/langchain-ai/openwiki)** has successfully popularized the concept of "documentation written for agents, by agents". It provides a straightforward CLI that writes and maintains a raw `openwiki/` folder, instructing `AGENTS.md` to reference it.

However, raw Markdown files without standardized schemas are difficult to programmatically validate, govern, and expose to external enterprise tools. 

**Agent-Ready Knowledge (ARK) / ContextOps** steps in as the structured, governed layer on top of your raw documentation.

### The Pipeline
1. **Generation (OpenWiki)**: Use OpenWiki to let agents effortlessly generate documentation.
2. **Structuring (ContextOps)**: Use `agent-ready import openwiki` to ingest that raw Markdown, applying the `software-project` OKF Profile.
3. **Validation (ContextOps)**: Run `agent-ready validate` in CI to ensure all architectural decisions, runbooks, and service definitions conform to your organization's schemas.
4. **Serving (ContextOps MCP)**: Boot `agent-ready serve:mcp` to expose this validated context securely to your organization's LLM ecosystem via the Model Context Protocol.

## Using the Importer

The `@ocf/cli` includes a dedicated bridge to convert an OpenWiki folder into an OKF Context Pack.

```bash
# Convert your OpenWiki folder into an OKF bundle (dry-run first)
npx agent-ready import openwiki --input ./openwiki --output .okf --dry-run

# Execute the import
npx agent-ready import openwiki --input ./openwiki --output .okf --force
```

### Mappings
The importer intelligently maps standard OpenWiki file conventions to the `software-project` profile:
- `overview.md` -> `ProjectOverview`
- `architecture.md` -> `ArchitectureDecision`
- `commands.md` -> `Runbook`
- `conventions.md` -> `CodingConvention`
- `testing.md` -> `Workflow`
- *(Other)* -> `DomainConcept`

## Instructing Agents

Once imported, update your `AGENTS.md` (or `.clauderc`) to point agents to the structured context pack rather than the raw files:

```markdown
# Agent Instructions

This repository uses ContextOps for structured agent knowledge. 

When you need context about architecture, commands, or conventions, DO NOT guess. 
Instead, rely on the validated OKF bundle located in \`.okf/\`. 

If you are connected via MCP, use the \`read_document\` tool.
```
