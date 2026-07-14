---
title: Delete Customer Data Macro
type: macro
version: 1.0.0
id: macro-delete-customer
description: The official macro for executing a GDPR or CCPA data deletion request.
labels: [privacy, macro]
---

# Delete Customer Data

**Purpose:** Triggers the internal privacy service to scrub a customer's record from all active databases and CRMs, excluding immutable financial audit logs.

**Pre-requisites:**
- Customer must have verified their identity.
- No pending orders or active disputes.

**Capability Mapping:**
When a user intent matches this macro, invoke the `delete_customer_data` capability with the `customerId`. This action is high-risk and will block pending HITL approval.
