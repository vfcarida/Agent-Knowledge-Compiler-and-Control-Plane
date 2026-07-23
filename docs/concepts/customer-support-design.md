# Customer Support (Alpha Flagship)

> **Status:** Alpha
>
> This domain compiles and validates. It serves as the third enterprise flagship for policy-aware, privacy-preserving support knowledge compilation. Core structure is functional; content depth and CRM integrations remain skeletal.

## What it demonstrates

Customer Support shows how AKCP handles tickets, macros, policies, customer history, PII redaction, escalation, and quality evaluation in a strict, high-volume environment. The current Alpha provides:

- **Working compilation**: `akcp compile` produces a full context pack, MCP manifest, and OpenWiki docs.
- **Policy-gated actions**: HITL approval required for `issue_refund` and `delete_customer_data`.
- **PII redaction config**: SSN, credit card, auth tokens, email, and phone redacted at the Control Plane level.
- **Structured evals**: 5 evaluation scenarios covering policy adherence, PII redaction, source grounding, and escalation.

## Current Limitations (Alpha)

- [x] Knowledge sources are skeletal (6 synthetic fixtures — not production-grade content)
- [ ] Policies defined but not battle-tested with real agent traffic
- [x] Evals exist but coverage is limited to 5 basic scenarios
- [ ] No real CRM/ticketing integration — all sources are static stubs
- [ ] Dangerous capabilities (`issue_refund`, `delete_account`) are unimplemented skeletons

## Why it matters

Customer Support is a high-value enterprise use case because it requires complex context assembly (historical tickets, customer profiles) alongside strict governance (PII redaction, policy adherence). Unlike static knowledge retrieval, support agents must interact with customer data, apply conditional logic (SLAs, escalations), and execute macros, all while strictly preventing policy hallucinations or privacy breaches.

## How it differs from Career and IT Ops

- **Career:** A low-friction, personal starter domain focused on static knowledge compilation (resumes, skills).
- **IT Operations:** An internal enterprise domain focused on high-risk technical approvals, runbook adherence, and incident telemetry.
- **Customer Support:** An external-facing enterprise domain focused on privacy (PII redaction), multi-tenant isolation, policy-constrained responses, and CRM integrations. It introduces high variability in user input (customer tickets) and requires strict boundaries around what the agent is authorized to promise.

## Domain Model

The following concept types are implemented in the current Alpha sources:

- `SupportArticle`, `SupportTicket`, `CustomerProfile`, `EscalationPath`, `SLA`, `ProductIssue`

Planned for future milestones:

- `Conversation`, `Macro`, `SentimentSignal`, `SupportQualityEvaluation`, `ResolutionNote`

## Required Controls (Implemented)

- **PII redaction:** Configured at `controlPlane.disableInLogs` level (SSN, credit card, email, phone, auth tokens).
- **Policy-constrained responses:** `read_support_knowledge`, `draft_response`, `summarize_ticket` policies defined.
- **Escalation when confidence is low:** `escalate_to_human` policy defined.
- **Human review for sensitive cases:** `issue_refund` and `delete_customer_data` require HITL approval.

## Next Milestone

To advance to **Beta**, this domain needs:

- [x] Production-depth knowledge sources (real policy content, not synthetic)
- [x] At least 20 eval scenarios covering edge cases
- [ ] At least one real CRM connector (Zendesk, Freshdesk, or similar)
- [ ] Expanded capability implementations beyond the current stubs

---

_For the roadmap and implementation phases, please refer to the [Product Roadmap](../governance/roadmap.md)._
