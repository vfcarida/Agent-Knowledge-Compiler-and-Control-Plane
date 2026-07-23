---
schemaVersion: "okf/v1"
id: "remediation-rollback-deployment"
type: "RemediationAction"
title: "Rollback Deployment"
description: "Rolls back a service to its previous stable version. This is a destructive, approval-gated action."
tags:
  - "remediation"
  - "deployment"
  - "approval-required"
riskLevel: "Critical"
requiresApproval: true
scriptRef: "scripts/rollback-deployment.sh"
---

# Remediation Action: Rollback Deployment

> **Risk Level**: Critical — requires explicit human approval before execution.

This remediation action instructs the deployment system to roll a service back to the previously known-good version. It is surfaced by the AKCP agent during incident triage but **never executed autonomously**.

## What It Does

1. Identifies the last successful deployment for the target service.
2. Stages the rollback configuration.
3. **Requests human approval** via the AKCP control plane.
4. Upon approval, executes the rollback and logs the event to the audit trail.
5. Streams execution status back to the incident bridge.

## Simulated Script (No Real Endpoints)

```bash
#!/usr/bin/env bash
# scripts/rollback-deployment.sh
# SIMULATION ONLY — No production endpoints are called.
set -euo pipefail

SERVICE="${1:?SERVICE required}"
TARGET_VERSION="${2:?TARGET_VERSION required}"

echo "[SIMULATION] Would execute: kubectl rollout undo deployment/${SERVICE}"
echo "[SIMULATION] Target version: ${TARGET_VERSION}"
echo "[SIMULATION] Audit event: remediation.rollback approved by ${AKCP_APPROVER:-unknown}"
echo "[SIMULATION] Status: success (simulated)"
```

> **Security Note**: In production, the real script would be stored in a secured secrets manager and only accessible with a scoped service account. Credentials must never appear in logs.

## Audit Trail

AKCP logs the following fields for every invocation of this action:

| Field           | Value                            |
|-----------------|----------------------------------|
| `capability`    | `it-operations.execute_remediation` |
| `action`        | `rollback_deployment`            |
| `approvedBy`    | (email of approver)             |
| `approvedAt`    | (ISO timestamp)                 |
| `executedAt`    | (ISO timestamp)                 |
| `status`        | `success` or `failed`           |
