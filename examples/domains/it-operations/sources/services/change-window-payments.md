---
schemaVersion: "okf/v1"
id: "change-window-payments"
type: "ChangeWindow"
title: "Payment Service Change Window"
description: "Approved change window for production deployments to the Payment Service."
tags:
  - "change-management"
  - "payments"
serviceRef: "svc-payment"
dayOfWeek: "Tuesday,Thursday"
startTime: "02:00 UTC"
durationHours: 2
---

# Payment Service — Change Window

## Policy

Production deployments to `svc-payment` are only permitted during the approved change window:

- **Days**: Tuesday and Thursday
- **Time**: 02:00–04:00 UTC
- **Duration**: 2 hours maximum

## Emergency Exceptions

Emergency changes outside the window require:
1. Approval from the Engineering Lead (Level 2 escalation)
2. Documented justification in the incident ticket
3. An automated rollback plan pre-tested in staging

All emergency changes are logged in the audit trail and reviewed in the next postmortem.

## Automated Enforcement

AKCP's control plane blocks `deploy_service` capabilities during non-window hours unless an explicit emergency override is granted via the approval flow.
