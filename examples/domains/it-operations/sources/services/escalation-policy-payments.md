---
schemaVersion: "okf/v1"
id: "escalation-policy-payments"
type: "EscalationPolicy"
title: "Payment Service Escalation Policy"
description: "Escalation ladder for incidents affecting the Payment Service."
tags:
  - "escalation"
  - "payments"
  - "oncall"
serviceRef: "svc-payment"
levels:
  - level: 1
    ownerRef: "owner-team-payments"
    timeoutMinutes: 5
  - level: 2
    ownerRef: "owner-team-payments"
    timeoutMinutes: 10
  - level: 3
    ownerRef: "owner-team-payments"
    timeoutMinutes: 20
---

# Payment Service — Escalation Policy

## Overview

All incidents affecting `svc-payment` must follow this escalation ladder. AKCP enforces these timeouts when the control plane is integrated with the alert routing system.

## Levels

| Level | Contact              | Timeout | Notes                                         |
|-------|----------------------|---------|-----------------------------------------------|
| L1    | On-call engineer     | 5 min   | Must acknowledge alert                        |
| L2    | Engineering Lead     | 10 min  | Joins bridge call, drives mitigation          |
| L3    | VP Engineering       | 20 min  | Authorizes emergency changes (bypasses change window) |

## SEV-1 Override

For SEV-1 incidents, all three levels are paged simultaneously. The change-window restriction is suspended, but the capability approval policy remains enforced.
