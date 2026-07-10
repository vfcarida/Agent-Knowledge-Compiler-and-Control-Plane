# Domain Adapter Guide

While the Agent Knowledge Compiler and Control Plane (AKCP) (OCF) Orchestrator was built for Career Management, the underlying architecture is domain-agnostic.

## How to adapt for a new domain (e.g., IT Operations)

1. **Create the OKF Profile**: Fork `docs/reference/ocf-profile.md` into `it-ops-profile.md`. Define new schemas (e.g., `Server`, `Incident`, `Runbook`).
2. **Update `@ocf/core`**: Add Zod validation schemas for the new types.
3. **Write New Automation Strategies**: Instead of `LinkedInStrategy`, write `JiraStrategy` or `PagerDutyStrategy` in `packages/mcp-automation-server/src/automation/strategies/`.
4. **Define Tool Contracts**: Register new MCP tools (e.g., `acknowledge_incident` instead of `prepare_application`).
5. **Update the HITL Policy**: Define which tools require `act-with-approval` in `autonomy-policy.ts`.
