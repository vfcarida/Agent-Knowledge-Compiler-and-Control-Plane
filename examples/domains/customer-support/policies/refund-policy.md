---
type: SupportPolicy
schemaVersion: "0.1"
policyId: "policy-refund"
title: "Refund Policy"
category: refunds
---

# Refund Policy

## Eligibility

1. **Digital Subscriptions:** Customers are eligible for a full refund within 14 days of their initial purchase, provided they have not downloaded or consumed more than 10% of the available content.
2. **Physical Goods:** Refunds are accepted within 30 days of delivery for defective items or un-opened returns.
3. **Prorated Refunds:** Annual subscriptions canceled mid-year are eligible for a prorated refund of the remaining full months.

## Execution Requirements

Before issuing a refund using the `issue_refund` capability:
- The agent **MUST** verify the original purchase date in the customer history.
- The agent **MUST** request a Human-in-the-Loop (HITL) approval via the Control Plane if the refund exceeds $100 USD.
- The agent **MUST NOT** hallucinate an approval. If the control plane denies the request, escalate the ticket.
