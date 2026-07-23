---
type: SupportIntent
schemaVersion: "1.0"
intentId: "issue-login"
title: "Troubleshooting: Authentication / Login Issues"
riskLevel: "medium"
---

# Troubleshooting: Authentication / Login Issues

## Description

This runbook covers issues related to customers being unable to log into their accounts. This includes forgotten passwords, locked accounts after failed attempts, SSO integration failures, and magic link issues.

## Diagnostic Decision Tree

### 1. Identify the Login Method

Determine how the customer normally logs in:

- **Email/Password:** Proceed to Section 2A.
- **SSO (Google, Apple, Microsoft):** Proceed to Section 2B.
- **Magic Link:** Proceed to Section 2C.

### 2A. Email / Password

1. **Check Account Status:** Is the account locked due to too many failed attempts (Error: `AUTH_429`)?
   - **If Locked:** Verify the customer's identity by asking them to confirm the last 4 digits of their credit card on file or their billing zip code. Once verified, manually unlock the account and trigger a password reset email.
   - **If Not Locked:** The customer has forgotten their password. Send a password reset link.

### 2B. Single Sign-On (SSO)

1. **Error Check:** Ask the customer for the specific error message.
   - `OAUTH_PROVIDER_ERROR`: The issue is on the provider's side (e.g., Google is down). Advise the customer to try again later or use an alternative login method if configured.
   - `EMAIL_ALREADY_EXISTS`: The customer previously signed up with email/password and is trying to use SSO with the same email. Send instructions on how to link accounts.

### 2C. Magic Link

1. **Delivery Issues:** Customer states they are not receiving the email.
   - Check the email logs in the CRM. Did the email bounce? (If yes, verify spelling).
   - Ask the customer to check spam/junk folders.
   - Resend the magic link.
2. **Expired Links:** Magic links expire after 15 minutes. If the customer clicks an expired link, they will see a `TOKEN_EXPIRED` error. Advise them to request a new link and use it immediately.

## Known Error Codes

- `AUTH_401`: Invalid credentials.
- `AUTH_403`: Account suspended (Escalate to Trust & Safety).
- `AUTH_404`: Account not found.
- `AUTH_429`: Too many failed attempts. Account locked for 30 minutes.

## Escalation Criteria

- If the customer reports that they are receiving password reset emails without requesting them (potential account takeover attempt). Escalate to Security/Tier 3.
- If SSO login fails for an entire Enterprise tenant. Escalate to DevOps immediately.
