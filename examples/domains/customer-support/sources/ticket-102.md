---
type: SupportTicket
schemaVersion: "1.0"
ticketId: "tkt-102"
channel: "email"
status: "open"
priority: "medium"
customerRef: "profile-janedoe"
createdAt: "2026-07-16T14:20:00Z"
containsPii: true
piiClasses: ["email", "credit_card"]
---

# Ticket: 102 - Unrecognized Charge / Billing Dispute

**Description:**
Customer Jane Doe (Email: jane.doe@example.com) is disputing a charge of $49.99 on her credit card ending in 4321. She claims she canceled her Premium subscription last month.

**Interaction History:**

- **[2026-07-16 14:20Z] System:** Ticket created via Web Form.
- **[2026-07-16 14:20Z] Customer (Jane Doe):** "Hello, I just saw a charge for $49.99 on my Visa ending in 4321 from your company. I canceled my Premium subscription over a month ago. I want a refund immediately, this is unacceptable."
- **[2026-07-16 14:25Z] System:** Attached billing history metadata. (Subscription cancelled on 2026-06-15. Charge occurred on 2026-07-15. Charge source: Annual renewal of a separate 'Analytics Add-on' that was not cancelled).

**Required Action:**
Review the billing history. The customer cancelled the core subscription but left an add-on active. The agent needs to explain this to the customer. Since the charge is within 30 days, a refund is permissible under the standard policy, but it requires HITL approval via the `issue_refund` capability. The agent should ask if the customer wants to proceed with the refund and cancellation of the add-on.
