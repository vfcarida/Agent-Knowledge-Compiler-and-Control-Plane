---
type: SupportPolicy
schemaVersion: "0.1"
policyId: "policy-pii"
title: "Data Retention and PII Policy"
category: privacy
---

# PII and Data Retention

## PII Redaction
Agents must **never** output raw Personally Identifiable Information (PII) to the audit log or in responses unless strictly required to fulfill the user's intent (e.g., confirming a shipping address).

The AKCP Control Plane is configured to automatically redact:
- Social Security Numbers (SSN)
- Credit Card numbers
- Passwords and auth tokens
- Email addresses and phone numbers (in audit logs)

## Data Deletion Requests (GDPR/CCPA)
If a user requests account deletion under GDPR or CCPA:
1. Do **not** issue a refund unless explicitly requested.
2. Execute the `delete_customer_data` macro.
3. This action requires HITL approval. Inform the user that the request is pending manual review.
