---
schemaVersion: "okf/v1"
id: "svc-payment"
type: "Service"
title: "Payment Service"
description: "Handles all credit-card and wallet transactions. Tier-1 revenue-critical service."
tags:
  - "tier-1"
  - "payments"
  - "pci-dss"
ownerRef: "owner-team-payments"
repository: "https://github.com/example-org/payment-service"
tier: "Tier 1"
dependencies:
  - "svc-auth"
  - "svc-fraud-detection"
systemRef: "sys-commerce"
---

# Payment Service

The Payment Service handles all credit-card and digital-wallet transactions. It is the primary Tier-1 revenue-critical service and is subject to PCI-DSS compliance requirements.

## Architecture

- **Language**: Go
- **Database**: PostgreSQL (ACID transactions, read replicas)
- **Cache**: Redis (idempotency keys, rate limiting)
- **Dependencies**: Auth Service (token validation), Fraud Detection Service (risk scoring)

## SLOs

| Indicator         | Target  | Window |
|-------------------|---------|--------|
| Availability      | 99.95%  | 30d    |
| P99 Latency       | < 500ms | 7d     |
| Error Rate        | < 0.1%  | 7d     |

## On-Call

- **Team Slack**: `#ops-payments`
- **PagerDuty**: `payments-primary`
- **Escalation**: See `escalation-policy-payments.md`

## Change Window

Deployments are restricted to **Tuesday and Thursday 02:00–04:00 UTC** via `change-window-payments.md`.

## Alert Runbooks

- High CPU → `runbook-high-cpu`
- Failed Payments Spike → `runbook-payment-failures`
- Database Connection Exhaustion → `runbook-db-connection-exhaustion`
