---
type: SLAPolicy
schemaVersion: "1.0"
slaId: "sla-standard"
title: "Service Level Agreements (SLA) by Segment"
segment: "standard"
priority: "high"
---

# Service Level Agreements (SLA) by Segment

This document defines the expected response and resolution times for customer support tickets across all customer segments.

## Definitions

- **First Response Time (FRT):** The time elapsed between the ticket creation and the first meaningful response from a human agent (automated receipts do not count).
- **Resolution Time (RT):** The time elapsed from ticket creation until the ticket status is changed to "Resolved".
- **Workaround:** A temporary fix that restores business operations while a permanent resolution is being developed. A workaround pauses the SLA clock but does not mark the ticket as resolved.

## SLAs by Segment

### 1. Standard Segment (Free / Basic Users)

- **Low Priority:** FRT 24 hours | RT 5 days
- **Medium Priority:** FRT 12 hours | RT 3 days
- **High Priority:** FRT 4 hours | RT 24 hours
- **Critical:** FRT 1 hour | RT 4 hours

### 2. Premium Segment (Paid Pro Users)

- **Low Priority:** FRT 12 hours | RT 3 days
- **Medium Priority:** FRT 4 hours | RT 24 hours
- **High Priority:** FRT 2 hours | RT 12 hours
- **Critical:** FRT 30 minutes | RT 2 hours

### 3. Enterprise Segment (Custom Contracts)

Enterprise customers have dedicated Account Managers and prioritized routing.

- **Low Priority:** FRT 4 hours | RT 24 hours
- **Medium Priority:** FRT 2 hours | RT 12 hours
- **High Priority:** FRT 1 hour | RT 4 hours
- **Critical:** FRT 15 minutes | RT 1 hour

## SLA Breaches and Penalties

- **Standard/Premium:** SLA breaches result in internal reporting flags and potential agent performance reviews. No financial penalties apply.
- **Enterprise:** Breaches of High or Critical SLAs may trigger contractual service credits. Any ticket approaching an Enterprise SLA breach (within 30 minutes for Critical, 2 hours for High) MUST be escalated to the Shift Lead immediately.

## Exceptions

SLAs are suspended during declared platform-wide outages (Status Page: Red).
