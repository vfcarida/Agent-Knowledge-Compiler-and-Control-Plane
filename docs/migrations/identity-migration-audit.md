# Identity Migration Audit

| Legacy Term | Target Area | Decision | Replacement | Compatibility Impact |
|---|---|---|---|---|
| `Open Career Format` / `Open Career Format Orchestrator` | README, Docs, package.json descriptions | Replace | `Agent Knowledge Compiler and Control Plane (AKCP)` | None. Documentation only. |
| `Agent-ready Knowledge Reference Architecture` / `Agent-ready` | Docs, Spec | Replace | `Agent Knowledge Compiler and Control Plane` | None. Documentation only. |
| `ContextOps` | CLI help texts, Docs, Whitepaper | Replace | `AKCP` / `Agent Knowledge Compiler and Control Plane` | None. |
| `open-career-format-profile-server` | MCP Server Name (packages/mcp-profile-server) | Replace | `akcp-profile-server` | High. Any agent configurations depending on this name will break unless updated. |
| `OCFMcpProfileServer` | Internal Class Name | Replace | `AKCPProfileServer` | Low. Internal code refactoring. |
| `ocf://` | MCP URIs | Maintain as Alias / Deprecated | `akcp://` (Canonical) | Medium. We will accept `ocf://` with a warning, but return `akcp://` resources. |
| `OCF_*` (Env Vars) | Runtime Config (`server.ts`) | Maintain as Fallback | `AKCP_*` | Medium. We will read `OCF_*` if `AKCP_*` is unset, emitting a warning. |
| `@ocf/*` (Package Names) | `package.json` | Maintain (Strategy B) | Internal alias kept, but public docs refer to `@akcp/*`. | Low. Prevents massive npm breakage for now. |
| `akcp` (Binary) | `packages/cli` | New canonical | `akcp` | Low. Will alias `agent-ready` and `ocf` as deprecated. |
