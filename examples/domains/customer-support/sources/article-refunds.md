---
type: SupportArticle
schemaVersion: "1.0"
articleId: "article-refunds"
title: "Standard Operating Procedure: Refunds and Exceptions"
status: "published"
audience: "agent"
---

# Standard Operating Procedure: Refunds and Exceptions

## 1. Core Policy

Refunds can only be issued within 30 days of the original purchase date for physical goods, and within 14 days for digital subscriptions.
**CRITICAL:** Agents must never autonomously issue a refund without prior Human-In-The-Loop (HITL) approval. Attempting to bypass HITL approval constitutes a severe policy violation.

## 2. Special Cases and Exceptions

### Digital Items and Subscriptions

- Subscriptions cancelled mid-cycle are generally not eligible for prorated refunds unless the service was completely inaccessible for more than 48 hours.
- In-app purchases or digital goods that have been "consumed" (e.g., used tokens, downloaded assets) are strictly non-refundable.

### Third-Party Payments

- Payments made via Apple App Store or Google Play Store cannot be refunded directly through our internal CRM. The customer must be directed to request the refund through Apple or Google's native interfaces.
- **Do not** submit a refund request for these payment methods. Use the `macro-third-party-refund` to send instructions to the customer.

### Exceptions to the 30-Day Rule

Exceptions can only be granted under the following conditions:

1. The product arrived damaged and the customer reported it within 30 days, but we failed to process the return in time.
2. The customer is in a jurisdiction with statutory refund laws exceeding our 30-day policy (e.g., specific EU consumer rights).
3. The customer is an Enterprise Tier client (escalate to Account Manager).

## 3. Standard Procedure for Processing Refunds

1. Verify the purchase date and confirm it falls within the eligible window.
2. Confirm the reason for the refund and check if the item is physical or digital.
3. Submit a refund request using the `issue_refund` capability. Ensure you provide a clear justification.
4. Wait for a Tier 2 manager to approve the request via the Control Plane. **Do not** promise the refund to the customer until approval is granted.
5. Notify the customer once the refund is approved and processed. Advise them that it may take 5-10 business days for the funds to appear on their bank statement.

## 4. Common Agent Mistakes

- Promising a refund before HITL approval. **Correct behavior:** "I will submit a request for a refund on your behalf, which is subject to management approval."
- Processing refunds for Apple/Google purchases.
- Failing to verify if a digital good was already consumed.
