# Maturity and Feature Status

AKCP uses strict, evidence-based maturity levels. We do not claim production readiness without executable evidence (tests, documentation, and working examples).

> For the full maturity model definition with criteria and enforcement standards, see [docs/project/maturity-model.md](project/maturity-model.md).

## Maturity Definitions

| Level            | Definition                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| **Stable**       | Documented, tested, CI-validated, examples exist, no known critical gaps. Ready for production.             |
| **Beta**         | Mostly working and tested, API may change, limitations are documented. Ready for non-critical environments. |
| **Experimental** | Available for preview but incomplete. Not production-ready. APIs can break without notice.                  |
| **Planned**      | Not implemented; docs may describe intent only. No placeholder success states in CLI.                       |
| **Deprecated**   | Supported temporarily with a migration path. Will be removed in a future major version.                     |

## Current Feature Inventory

| Area                     | Status  | Evidence                                                                     | Next milestone             |
| ------------------------ | ------- | ---------------------------------------------------------------------------- | -------------------------- |
| AKCP CLI                 | Stable  | 30+ commands, integration tests, policy lint, git diff, graph & lifecycle    | npm registry publication   |
| AK-IR Compiler           | Stable  | 11 deterministic compile targets, SHA-256 provenance, concurrent ingestion   | incremental watch mode     |
| MCP Profile Server       | Stable  | contract tests, untrusted boundaries, opt-in WAF, stdio & HTTP transports    | federated OAuth            |
| MCP Automation Server    | Beta    | HITL approval store, SHA-256 replay protection, governed domain tools        | cloud provider connectors  |
| Control Plane (Gateway)  | Stable  | auth, token-bucket rate limit, HITL, PII redaction, WAF, OPA integration     | multi-region state sync    |
| Control Plane CLI        | Stable  | inspect, policies, approvals, audit commands & CLI tests                     | remote control API         |
| Dashboard UI & Serve     | Stable  | React 19 SPA, Overview & Settings panels, Playwright e2e tests, Express BFF  | live WebSocket streaming   |
| IT Operations (flagship) | Stable  | policies, evals, expected-output, golden compiler verification               | live Kubernetes adapter    |
| Career (starter)         | Stable  | full walkthrough, golden outputs                                             | —                          |
| Customer Support         | Stable  | sources, 8 policies, capabilities, governed MCP tools, golden outputs        | external CRM webhook sync  |
| Semantic Diff Engine     | Stable  | AST diff, `--from-git` / `--to-git` revision comparison, CI gating           | PR comment action          |
| Graph & Policy Linter    | Stable  | link target validation, cycle detection, `akcp policy lint`, GDPR/HIPAA/SOC2 | IDE quick-fix code actions |
| VSCode Extension         | Beta    | syntax highlighting, OKF frontmatter diagnostics, autocomplete, commands     | VSCode Marketplace publish |
| Legacy CLI               | Removed | legacy binaries deleted in v0.1.0                                            | —                          |
