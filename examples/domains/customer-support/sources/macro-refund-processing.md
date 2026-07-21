---
type: SupportMacro
schemaVersion: "1.0"
macroId: "macro-refund-processing"
title: "Standard Refund Request Workflow"
intentIds: ["issue-refund"]
tone: "formal"
requiresPersonalization: true
forbiddenWhen: ["account is suspended", "digital product consumed"]
---

# Macro: Standard Refund Request Workflow

**Usage:** Use this macro to initiate a refund request for eligible purchases. This macro strictly enforces the HITL (Human-In-The-Loop) approval requirement.

**Agent Procedure:**

1. Verify the purchase is within the 30-day window (or 14-day for digital).
2. Gather the Order ID and the exact reason for the refund request.
3. Execute the `issue_refund` capability. Ensure you provide the ticket ID and approval reason.
4. Set the ticket status to 'pending' while waiting for Tier 2 approval.

**Response Template:**

> Hello [Customer Name],
>
> Thank you for reaching out. I have reviewed your request regarding order [Order ID].
> As per our policy, I have submitted a formal refund request on your behalf. This requires review and approval from our management team.
>
> You can expect an update from us within 24-48 hours. Once approved, the funds will typically appear on your statement within 5-10 business days.
>
> Thank you for your patience.
