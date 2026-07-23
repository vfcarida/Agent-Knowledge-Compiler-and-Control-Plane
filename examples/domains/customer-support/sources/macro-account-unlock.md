---
type: SupportMacro
schemaVersion: "1.0"
macroId: "macro-account-unlock"
title: "Account Unlock after AUTH_429"
intentIds: ["issue-login"]
tone: "empathetic"
requiresPersonalization: true
---

# Macro: Account Unlock after AUTH_429

**Usage:** Use this macro when a customer's account is locked due to excessive failed login attempts.

**Agent Procedure:**

1. Ask the customer to verify their identity. (e.g., Last 4 digits of CC on file, or billing zip code).
2. Once verified, clear the AUTH_429 flag in the CRM backend.
3. Send a password reset link (as their current password may be compromised or forgotten).
4. Send this communication to the customer.

**Response Template:**

> Hello [Customer Name],
>
> I have successfully verified your information and unlocked your account.
> For your security, I have also triggered a password reset email. Please use the link in that email to set a new password and log back in.
>
> If you continue to experience issues, please reply directly to this email.
