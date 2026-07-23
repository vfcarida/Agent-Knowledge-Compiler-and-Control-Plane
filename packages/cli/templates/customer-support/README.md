# Customer Support Flagship

> **Status:** Alpha
>
> **Note:** The Customer Support Flagship is currently an experimental readiness bridge. Its capabilities (like refunds) are skeletal placeholders to demonstrate policy-gated architecture and PII redaction. It is not fully implemented.

## Vision

Customer Support is the planned third enterprise flagship demonstrating policy-aware, privacy-preserving support knowledge compilation. It shows how AKCP handles:
- Tickets and Customer History
- Support Macros
- SLA Policies
- PII Redaction
- Escalation Rules

## Domain Model

- `HelpArticle`, `Macro`, `Ticket`, `CustomerProfile`, `SupportPolicy`, `EscalationRule`, `ProductIssue`, `SLA`, `ResolutionNote`

All provided documents are synthetic fixtures containing no real customer PII.

## Architecture

This domain consists of:
- **`sources/`**: The synthetic OKF documents representing the knowledge base, macros, policies, and tickets.
- **`capabilities/`**: MCP tools governing support actions. Dangerous actions (like `issue_refund` and `delete_account`) are marked as explicitly unimplemented skeletons.
- **`policies/`**: Formal policy cards governing agent behavior (e.g. `read_support_knowledge`, `autonomous_actions`).
- **`akcp.yaml`**: The domain configuration mapping the OKF sources and configuring the Control Plane to redact sensitive fields (like SSNs and credit cards) and require HITL approvals for high-risk actions.

## Expected Dashboard Requirements

The future Control Plane dashboard for this domain will require:
- A real-time Support Queue view.
- Audit evidence of applied PII Redaction (showing obscured data).

## Commands

To compile this domain into a Context Pack and MCP manifest:

```bash
pnpm akcp compile --config examples/domains/customer-support/akcp.yaml
```

To see an agent walk through a simulated interaction using these policies, see the [Customer Support Walkthrough](walkthrough.md).
