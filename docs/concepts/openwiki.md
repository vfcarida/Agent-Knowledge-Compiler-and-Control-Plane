# OpenWiki Integration

OpenWiki (by LangChain) focuses on authoring and maintaining wiki-style documentation specifically tailored for agents. AKCP acts as the downstream consumer, importing OpenWiki content and transforming it into a robust, structured OKF representation.

## Mappings and Structures

- **Format Accepted**: Standard Markdown (`.md`) with optional YAML frontmatter.
- **Expected Structure**: Any directory tree of markdown files.
- **Mapping to AK-IR**:
  - OpenWiki documents are mapped to a generic `Document` OKF type if no type is provided.
  - The relative path becomes part of the identity/URI.
  - Existing frontmatter is preserved.

## Limitations and Risks

- **Data Loss Risk**: Since OpenWiki is loosely structured, AKCP will not attempt a destructive round-trip (sync back to OpenWiki) by default. The import is one-way (OpenWiki -> AKCP/OKF) unless explicitly managed.
- **Round-Trip Policy**: Round-trip updates to OpenWiki are currently disabled to prevent destroying loosely structured authoring data.
