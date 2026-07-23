# Maturity and Feature Status

AKCP uses strict, evidence-based maturity levels. We do not claim production readiness without executable evidence (tests, documentation, and working examples).

> For the full maturity model definition with criteria and enforcement standards, see [docs/project/maturity-model.md](project/maturity-model.md).

## Maturity Definitions

| Level | Definition |
|---|---|
| **Stable** | Documented, tested, CI-validated, examples exist, no known critical gaps. Ready for production. |
| **Beta** | Mostly working and tested, API may change, limitations are documented. Ready for non-critical environments. |
| **Experimental** | Available for preview but incomplete. Not production-ready. APIs can break without notice. |
| **Planned** | Not implemented; docs may describe intent only. No placeholder success states in CLI. |
| **Deprecated** | Supported temporarily with a migration path. Will be removed in a future major version. |

## Current Feature Inventory

| Area | Status | Evidence | Next milestone |
|------|--------|----------|----------------|
| AKCP CLI | Beta | tests, examples, init command | npm publish |
| AK-IR Compiler | Beta | spec, fixtures, pipeline stages | auto-normalization |
| MCP Profile Server | Beta | contract tests, SSE transport | remote hosting |
| MCP Automation Server | Alpha | safety tests, browser automation | real cloud integrations |
| Control Plane (Gateway) | Beta | auth, rate limit, HITL, PII, WAF | distributed deployment |
| Dashboard UI | Alpha | React app, e2e tests, Express server | feature completion |
| IT Operations (flagship) | Beta | policies, evals, expected-output | real infrastructure |
| Career (starter) | Stable | full walkthrough, golden outputs | |
| Customer Support | Alpha | sources, 8 policies, capabilities, evals | full implementation |
| VSCode Extension | Experimental | syntax highlighting | validation, autocomplete |
| Legacy CLI | Deprecated | deprecation warnings | removal in v1.0 |
