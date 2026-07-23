# Versioning Policy

AKCP strictly adheres to Semantic Versioning (SemVer) 2.0.0. However, because AKCP spans data payloads, network protocols, and CLI behavior, SemVer rules apply differently to each layer.

## 1. Context Pack Specification (OKF Base)

The structure of a Context Pack (`.agent-context/` directory, mandatory frontmatter keys like `type`) is versioned globally.

- **Current Version:** `v0.1.0`
- **Breaking (MAJOR):** Changing the `.agent-context` folder structure, removing the requirement for the `type` field, or fundamentally altering the OKF Markdown parsing strategy.

## 2. OKF Profiles (Schemas)

Individual domain profiles (e.g., `software-project`, `career`) are versioned independently.

- **Current Version:** `v1.0.0` (for `career`)
- **Breaking (MAJOR):** Making an optional field mandatory, removing a field, or changing a field's data type.
- **Minor (MINOR):** Adding a new optional field, adding a new document type to the profile.

## 3. Capability Manifests & MCP Tool Contracts

This governs the JSON-RPC tool contracts exposed by the MCP Profile and Automation servers.

- **Breaking (MAJOR):** Changing the tool name, adding mandatory arguments, or altering the cryptographic hashing algorithm used by the Automation Server.
- **Minor (MINOR):** Adding an optional argument, appending data to the return object.

## 4. CLI Behavior

- **Breaking (MAJOR):** Removing commands (e.g., `akcp validate`), changing exit codes for existing behaviors.
- **Minor (MINOR):** Adding new commands or flags.

---

**Note:** Any `0.x.y` version implies that the specification is in active beta and breaking changes MAY occur without a major version bump, though we will strive to document them.
