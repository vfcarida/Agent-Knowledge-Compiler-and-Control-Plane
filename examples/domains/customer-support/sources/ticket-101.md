---
type: SupportTicket
schemaVersion: "1.0"
ticketId: "tkt-101"
channel: "email"
status: "open"
priority: "high"
customerRef: "profile-johndoe"
createdAt: "2026-07-15T08:00:00Z"
containsPii: true
piiClasses: ["phone", "email"]
---

# Ticket: 101 - Login failure and account locked

**Description:**
Customer John Doe (Phone: 555-0100, Email: john.doe@example.com) reports that his account has been locked after multiple failed login attempts. He is requesting immediate assistance to unlock it so he can complete an urgent purchase.

**Interaction History:**

- **[2026-07-15 08:00Z] System:** Ticket created via Email.
- **[2026-07-15 08:00Z] Customer (John Doe):** "Hi, I can't log into my account. I tried my password a few times and now it says my account is locked. I really need to buy the new software license today. Please help!"
- **[2026-07-15 08:15Z] Automated System:** Sent standard automated response with password reset link.
- **[2026-07-15 08:30Z] Customer (John Doe):** "That link doesn't work. When I click it, it just takes me to a page that says '404 Not Found'. I've tried clearing my cookies and using a different browser (Chrome and Safari), but nothing works. Please fix this manually, I'm losing time."
- **[2026-07-15 09:10Z] Agent (Sarah Connor):** Checked account status in backend. Account is flagged with `AUTH_429`.

**Required Action:**
Agent must review the account status. Since the standard reset link is returning a 404 error (a known bug affecting a small percentage of users), the agent should verify the customer's identity and manually unlock the account, or escalate to Tier 2 if the 404 error persists after a manual override attempt.
