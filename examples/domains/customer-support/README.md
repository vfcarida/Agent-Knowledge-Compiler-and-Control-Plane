# Customer Support Flagship

> **Status:** Alpha
>
> This domain compiles and validates end-to-end. Sources and capabilities are functional but skeletal — not production-grade. See [Current Limitations](#current-limitations-alpha) below.

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

- **`sources/`**: 6 synthetic OKF documents representing the knowledge base, macros, policies, and tickets.
- **`capabilities/`**: MCP tools governing support actions. Dangerous actions (like `issue_refund` and `delete_account`) are marked as explicitly unimplemented skeletons.
- **`policies/`**: 9 policy cards governing agent behavior (e.g. `read_support_knowledge`, `autonomous_actions`).
- **`evals/`**: 5 evaluation scenarios covering policy adherence, PII redaction, source grounding, and escalation.
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

To see an agent walk through a simulated interaction using these policies, see the [Customer Support Walkthrough](walkthrough.md).

## Current Limitations (Alpha)

- [x] Knowledge sources are skeletal (6 synthetic fixtures — not production-grade content)
- [ ] Policies defined but not battle-tested with real agent traffic
- [x] Evals exist but coverage is limited to 5 basic scenarios
- [ ] No real CRM/ticketing integration — all sources are static stubs
- [ ] Dangerous capabilities (`issue_refund`, `delete_account`) are unimplemented skeletons

## Next Milestone (Beta criteria)

- [x] Production-depth knowledge sources
- [x] At least 20 eval scenarios covering edge cases
- [ ] At least one real CRM connector (Zendesk, Freshdesk, or similar)
- [ ] Full capability implementations beyond the current stubs
