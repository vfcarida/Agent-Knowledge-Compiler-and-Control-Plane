# Customer Support Flagship

> **Status:** Beta
>
> This domain compiles and validates end-to-end, verified by automated CI golden tests and Level 4 (AKCP-control-plane-compatible) conformance suite checks. See [Current Limitations](#current-limitations-beta) below.

## Vision

Customer Support is the third enterprise flagship demonstrating policy-aware, privacy-preserving support knowledge compilation. It shows how AKCP handles:

- Tickets and Customer History
- Support Macros
- SLA Policies
- PII Redaction
- Escalation Rules

## Domain Model

Implemented types: `SupportArticle`, `SupportTicket`, `CustomerProfile`, `EscalationPath`, `SLA`, `ProductIssue`

All provided documents are synthetic fixtures containing no real customer PII.

## Architecture

This domain consists of:

- **`sources/`**: 14 synthetic OKF documents representing the knowledge base, macros, policies, and tickets, plus synthetic ticket generation via `mock-zendesk`.
- **`capabilities/`**: MCP tools governing support actions. Dangerous actions (like `issue_refund` and `delete_account`) are marked as explicitly unimplemented skeletons.
- **`policies/`**: 9 policy cards governing agent behavior (e.g. `read_support_knowledge`, `autonomous_actions`).
- **`evals/`**: Evaluation scenarios covering policy adherence, PII redaction, source grounding, and escalation.
- **`akcp.yaml`**: The domain configuration mapping OKF sources and configuring the Control Plane to redact sensitive fields and require HITL approvals for high-risk actions.

## Commands

To compile this domain into a Context Pack and MCP manifest:

```bash
pnpm akcp compile --config examples/domains/customer-support/akcp.yaml
```

To validate sources against the `customer-support` profile:

```bash
pnpm akcp validate --bundle examples/domains/customer-support --profile customer-support
```

To see an agent walk through a simulated interaction using these policies, see the [Customer Support Walkthrough](WALKTHROUGH.md).

## Current Limitations (Beta)

- [x] Knowledge sources compile and validate end-to-end
- [x] Conformance certified at Level 4 (AKCP-control-plane-compatible)
- [x] Automated CI golden compiler snapshot test coverage
- [ ] Dangerous capabilities (`issue_refund`, `delete_account`) are mock skeletons
- [ ] No live production CRM connector integration (uses local sources and `mock-zendesk`)

## Next Milestone (Production criteria)

- [ ] Live CRM connectors (Zendesk, Freshdesk, ServiceNow)
- [ ] Real infrastructure capabilities with external webhook dispatch
- [ ] Live customer traffic load benchmarking
