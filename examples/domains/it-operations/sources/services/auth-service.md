---
schemaVersion: "okf/v1"
id: "svc-auth"
type: "Service"
title: "Auth Service"
description: "Manages JWT issuance, token validation, and user session lifecycle."
tags:
  - "tier-1"
  - "security"
  - "authentication"
ownerRef: "owner-team-security"
repository: "https://github.com/example-org/auth-service"
tier: "Tier 1"
dependencies:
  - "svc-session-store"
systemRef: "sys-identity"
---

# Auth Service

The Auth Service manages JWT issuance, token validation, and user session lifecycle. It is called synchronously by almost every other Tier-1 service, making its availability critical.

## Architecture

- **Language**: Rust
- **Session Store**: Redis Cluster (six shards, three availability zones)
- **Token Algorithm**: RS256, key rotation every 90 days

## SLOs

| Indicator    | Target  | Window |
|--------------|---------|--------|
| Availability | 99.99%  | 30d    |
| P99 Latency  | < 50ms  | 7d     |
| Error Rate   | < 0.01% | 7d     |

## On-Call

- **Team Slack**: `#ops-security`
- **PagerDuty**: `auth-primary`
- **Escalation**: See `escalation-policy-auth.md`

## Alert Runbooks

- Auth Failure Spike → `runbook-auth-failures`
- Token Validation Errors → `runbook-token-validation`
- Redis Session Store Degraded → `runbook-session-store`
