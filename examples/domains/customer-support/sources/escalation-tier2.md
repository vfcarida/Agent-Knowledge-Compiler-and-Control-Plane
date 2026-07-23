---
type: EscalationRule
schemaVersion: "1.0"
ruleId: "escalation-tier2"
title: "Escalation Guidelines: When and How to Escalate"
riskLevel: "medium"
routeTo: "technical"
requiresHumanApproval: true
---

# Escalation Guidelines: When and How to Escalate

This document outlines the criteria for escalating a ticket from Tier 1 (General Support) to Tier 2 (Technical Support / Specialists).

## When to Escalate to Tier 2

Escalate a ticket ONLY if one or more of the following criteria are met:

1. **Technical Blockers:** The customer's issue requires access to backend systems, database queries, or server logs that Tier 1 agents do not have permissions for.
2. **Persistent Bugs:** The customer is reporting a reproducible bug that is not listed on the Known Issues dashboard.
3. **Unresolved Account Locks:** A customer account remains locked even after standard reset procedures have been correctly followed, and the system continues to return 4xx errors.
4. **SLA Jeopardy (Premium/Enterprise):** A High or Critical priority ticket for a Premium or Enterprise customer is at risk of breaching its SLA and Tier 1 cannot resolve it immediately.

## When NOT to Escalate

Do NOT escalate tickets in the following scenarios. Tier 1 agents must handle these:

- The customer is simply angry or impatient, but the issue is a standard Tier 1 process (e.g., asking for a refund status update).
- The issue is documented in a Help Article, and the agent has not yet attempted the documented resolution steps.
- The ticket lacks necessary diagnostic information. (You must ask the customer for screenshots, error codes, or browser information BEFORE escalating).

## Escalation Procedure and Handoff Notes

When escalating, you must use the `escalate_ticket` capability and provide a clear, concise handoff note.

**Mandatory Handoff Note Template:**
`Issue Summary:` [Brief description of the problem]
`Steps to Reproduce:` [If applicable]
`What I've Tried:` [List troubleshooting steps already taken by Tier 1]
`Why it's escalated:` [Which criteria from section 1 is met]

## Customer Communication

When a ticket is escalated, you must inform the customer. Do not promise a specific timeframe unless dictated by their SLA.
**Approved Phrasing:** "I have escalated this issue to our Technical Support team for further investigation. They will review the details and reach out to you as soon as possible."
