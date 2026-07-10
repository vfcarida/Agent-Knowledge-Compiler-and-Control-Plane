# Playbook: Codebase Documentation to Agent Context

## Objective
Transform stagnant, unstructured codebase documentation (Confluence, standard READMEs, wikis) into dynamic, akcp Open Knowledge Format (OKF) bundles.

## Prerequisites
- Existing documentation repository or export capability from corporate wikis.
- `akcp` CLI installed.

## Stakeholders
- **Technical Writers / Developers:** Own the migration of content.
- **Agent Builders:** Consume the resulting context.

## Executable Steps

1. **Import Existing Docs:**
   Use the AKCP import command to ingest a folder of Markdown files.
   ```bash
   akcp import openwiki -i ./legacy-docs -o ./agent-context
   ```
2. **Apply Semantic Types:**
   Manually review the imported files. Ensure the YAML frontmatter correctly maps to OKF types (e.g., `skill`, `experience`, `architecture`, `concept`).
3. **Manage Freshness:**
   Add `lastReviewedAt` and `reviewCadenceDays` to critical documents to prevent agents from grounding on outdated architecture.
4. **Compile and Inspect:**
   ```bash
   akcp compile --bundle ./agent-context
   akcp graph build --bundle ./agent-context
   akcp graph impact -c architecture-decision-1
   ```
5. **Sync with Agent Prompts:**
   Inject the awareness of this context pack into the repository's `.cursorrules` or `AGENTS.md`.
   ```bash
   akcp agents sync
   ```

## Risks & Limitations
- **Anti-pattern:** Dumping 10,000 files into a single bundle. Use the `ContextPlanner` to split massive wikis into domain-specific packs to avoid Context Collapse.
- **Risk:** Agents using deprecated docs. Rely on the `akcp lifecycle report` to prune stale knowledge.

## Metrics (Before/After)
- **Before:** Context is unstructured; agents frequently encounter context window limits by reading massive, irrelevant files.
- **After:** Agents dynamically load only the required semantic nodes via MCP or chunked OpenWiki targets.
- **Metric:** Token budget consumed per agent interaction (measure reduction via economics report).

## Definition of Done
- Legacy docs are converted to OKF Markdown.
- `akcp lifecycle report` shows 0 deprecated/stale docs in active rotation.
- Repository `AGENTS.md` explicitly points to the new bundle.
