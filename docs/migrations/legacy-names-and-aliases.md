# Legacy Names and Aliases Policy

## What is an Alias?
An alias is a programmatic shim that translates a legacy invocation or configuration into the canonical AKCP equivalent. It ensures backwards compatibility.

## What is Deprecated?
A feature, name, or variable is marked as deprecated if it is currently supported via an alias but is scheduled for removal.

## Legacy Names and Policies

### CLI Commands
- **Legacy:** `agent-ready`
- **Status:** Deprecated Alias.
- **Action:** Triggers a console warning, then delegates to `akcp`.
- **Removal Date:** Next major release (v1.0.0).

### Environment Variables
- **Legacy:** `OCF_*` (e.g., `OCF_BUNDLE_PATH`)
- **Status:** Deprecated Fallback.
- **Action:** If `AKCP_*` is not found, the system checks for `OCF_*`. If found, it emits a console warning and uses the value.
- **Removal Date:** Next major release (v1.0.0).

### MCP URIs
- **Legacy:** `ocf://`
- **Status:** Deprecated Fallback.
- **Action:** The system accepts `ocf://` requests but responds with canonical `akcp://` payload structures. Client integrations should be updated.
- **Removal Date:** Next major release (v1.0.0).

### NPM Packages
- **Legacy:** `@ocf/*`
- **Status:** Maintained (Strategy B).
- **Action:** The physical package names remain `@ocf/*` in `package.json` to prevent massive breakage, but all public-facing documentation must use `@akcp/*`. Internal aliases will be provided in the future for seamless migration.
