---
type: SupportMacro
schemaVersion: "1.0"
macroId: "macro-password-reset"
title: "Trigger Password Reset Email"
intentIds: ["issue-login"]
tone: "empathetic"
requiresPersonalization: true
---

# Macro: Trigger Password Reset Email

**Usage:** Use this macro when a customer has forgotten their password or has an unlocked account but needs a new password. Do NOT use if the account is currently locked due to too many failed attempts (AUTH_429).

**Agent Procedure:**

1. Verify the customer's email address matches the profile in the CRM.
2. Confirm the account is NOT locked.
3. Inform the customer that a reset link will be sent.
4. Execute the system command to send the reset link (simulate via CRM).

**Response Template:**

> Hello [Customer Name],
>
> I understand you're having trouble logging in. I've just sent a password reset link to [Customer Email].
> Please check your inbox (and spam folder) and click the link to create a new password.
> The link will expire in 15 minutes.
>
> Let me know if you need any further assistance!
