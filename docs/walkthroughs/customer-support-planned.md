# Customer Support (Planned Flagship)

> **Status:** Planned
> **Note:** This domain is currently in the design phase. It serves as a readiness placeholder to demonstrate the future capabilities of AKCP. It is not yet fully implemented.

## What it will demonstrate

Customer Support is the future enterprise flagship for policy-aware, privacy-preserving support knowledge compilation. It will show how AKCP handles tickets, macros, policies, customer history, PII redaction, escalation, and quality evaluation in a strict, high-volume environment.

## Why it matters

Customer Support is a high-value enterprise use case because it requires complex context assembly (historical tickets, customer profiles) alongside strict governance (PII redaction, policy adherence). Unlike static knowledge retrieval, support agents must interact with customer data, apply conditional logic (SLAs, escalations), and execute macros, all while strictly preventing policy hallucinations or privacy breaches.

## How it differs from Career and IT Ops

- **Career:** A low-friction, personal starter domain focused on static knowledge compilation (resumes, skills).
- **IT Operations:** An internal enterprise domain focused on high-risk technical approvals, runbook adherence, and incident telemetry.
- **Customer Support:** An external-facing enterprise domain focused on privacy (PII redaction), multi-tenant isolation, policy-constrained responses, and CRM integrations. It introduces high variability in user input (customer tickets) and requires strict boundaries around what the agent is authorized to promise.

## Future Domain Model

The following concepts are planned for the Customer Support domain:
- `Customer`
- `Ticket`
- `Conversation`
- `Macro`
- `HelpArticle`
- `Policy`
- `EscalationRule`
- `SLA`
- `ProductArea`
- `Resolution`
- `SentimentSignal`
- `PIIEntity`
- `SupportQualityEvaluation`

## Required Controls (Future Safety Model)

To safely deploy Customer Support agents, AKCP will enforce the following controls:
- **PII redaction:** Automatic scrubbing of sensitive customer data from LLM contexts.
- **Policy-constrained responses:** Ensuring agents cannot hallucinate refund policies or SLA commitments.
- **Escalation when confidence is low:** Mandatory fallback to human agents.
- **Human review for sensitive cases:** Pre-execution approvals for high-impact macros (e.g., account deletion, large refunds).
- **No hallucinated policy commitments:** Strict adherence to the provided context pack.
- **Audit evidence:** Full traceability of the agent's context and tool usage for every customer interaction.
- **CRM connector boundaries:** Least-privilege access to external CRM systems.
- **Tenant isolation in enterprise settings:** Ensuring data from one customer cannot leak into another's context.

---
_For the roadmap and implementation phases, please refer to the [Product Roadmap](../governance/roadmap.md)._
