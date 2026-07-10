# Compatibility & Deprecation Policy

To maintain trust with enterprise adoptions, ContextOps enforces a strict compatibility and deprecation policy. Agents and automated systems must be able to rely on the stability of MCP tools and OKF schemas.

## 1. Additive Changes (Non-Breaking)
The following changes are considered **backward compatible** and will only trigger a MINOR version bump:
- Adding new optional properties to OKF Schemas (Profiles).
- Adding new MCP tools to the server.
- Adding new optional arguments to existing MCP tools.
- Adding new commands to the CLI.

> **Requirement:** All parsers and agents interacting with ContextOps MUST tolerate unknown keys in JSON payloads and OKF Frontmatter.

## 2. Breaking Changes
The following changes are **breaking** and require a MAJOR version bump:
- Removing an existing MCP tool.
- Renaming an existing MCP tool or argument.
- Making a previously optional OKF Profile field mandatory.
- Changing the semantic meaning or expected data type of an existing field.

### Migration Requirements
Any breaking change MUST be accompanied by:
1. An approved [RFC](../rfcs/README.md).
2. A CLI migration path (e.g., `agent-ready migrate --to v2`).

## 3. Deprecation Timeline
When a feature, schema field, or MCP tool is scheduled for removal:
1. **Deprecation Phase:** The feature is marked as `@deprecated` in the schema/tool description. It will emit a console warning if used via CLI. This phase lasts for at least **one full MAJOR release cycle** or **6 months**, whichever is longer.
2. **Removal Phase:** The feature is removed in the subsequent MAJOR release.

## 4. Experimental Features
Features marked as `experimental` (usually hidden behind a flag like `--experimental-feature`) are exempt from semantic versioning guarantees. They may be altered or removed at any time in a MINOR or PATCH release. 

Experimental features MUST be clearly documented as such in their respective tool descriptions or CLI help text.
