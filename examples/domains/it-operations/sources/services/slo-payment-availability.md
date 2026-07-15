---
schemaVersion: "okf/v1"
id: "slo-payment-availability"
type: "SLO"
title: "Payment Service - Availability SLO"
description: "99.95% availability target for the Payment Service over a 30-day rolling window."
tags:
  - "slo"
  - "payments"
  - "availability"
serviceRef: "svc-payment"
indicator: "availability"
target: "99.95%"
window: "30d"
---

# Payment Service — Availability SLO

## Definition

The **Payment Service Availability SLO** requires that the service successfully handles at least 99.95% of incoming requests over a rolling 30-day window. A request is considered a failure if it returns a 5xx response or times out after 30 seconds.

## Error Budget

| Window | Allowed Downtime |
|--------|-----------------|
| 30d    | ~21.6 minutes   |
| 7d     | ~5 minutes      |

## Burn Rate Alerts

| Burn Rate | Alert Window | Action                          |
|-----------|--------------|---------------------------------|
| 14x       | 1 hour       | Page primary on-call immediately |
| 6x        | 6 hours      | Notify team, begin investigation |
| 3x        | 1 day        | Create a tracking issue          |

## Consequences of SLO Breach

A breach of this SLO triggers a mandatory postmortem and blocks all non-emergency deployments until the error budget is restored.
