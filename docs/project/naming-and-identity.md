# Naming and Identity Policy

## Canonical Name
The canonical name of this project is:
**Agent Knowledge Compiler and Control Plane**

## Acronym
The official acronym is **AKCP**.

## CLI and Commands
The canonical CLI binary is `akcp`.
Any references in documentation must use `akcp`.

## MCP Servers
- Profile Server: `akcp-profile-server`
- Automation Server: `akcp-automation-server`

## URIs
The canonical URI scheme for resources within this system is `akcp://`.
Example: `akcp://bundle/index`

## Environment Variables
All configuration environment variables must be prefixed with `AKCP_`.
Examples: `AKCP_BUNDLE_PATH`, `AKCP_IR_PATH`, `AKCP_CONFIG_PATH`, `AKCP_RUNTIME_MODE`, `AKCP_POLICY_PATH`.

## Packages
The ultimate target for NPM packages is `@akcp/*`.
Currently, for compatibility (Strategy B), the `@ocf/*` packages are maintained under their legacy names in npm, but are documented publicly as `@akcp/*`.

## Legacy and Forbidden Terms
The following terms are considered legacy and must not be used in new documentation or code:
- Open Career Format
- Open Career Format Orchestrator
- OCF
- Agent-ready Knowledge Reference Architecture
- Agent-ready
- ContextOps
