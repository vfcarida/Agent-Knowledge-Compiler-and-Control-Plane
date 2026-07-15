---
schemaVersion: "okf/v1"
id: "postmortem-2026-001"
type: "Postmortem"
title: "Postmortem: Payment Service Outage — INC-2026-001"
description: "Root cause analysis and action items for the 65-minute SEV-1 payment outage on 2026-04-14."
tags:
  - "postmortem"
  - "payments"
  - "database"
incidentRef: "inc-2026-001"
rootCause: "svc-payment v1.4.2 introduced a misconfigured database connection pool (max_connections set to 5 instead of 500). Under normal traffic load the pool exhausted within 5 minutes of the deployment, causing all requests to queue and then timeout."
actionItems:
  - "Add connection pool configuration validation to the CI pipeline (owner: payments-team, due: 2026-05-01)"
  - "Create a canary deployment stage that validates DB connection pool health before full rollout (owner: infra-team, due: 2026-05-15)"
  - "Add a dedicated alert for connection pool utilization > 80% (owner: observability-team, due: 2026-04-21)"
  - "Update the High CPU and DB runbooks to include connection pool exhaustion as an explicit triage path"
dateCompleted: "2026-04-16"
---

# Postmortem — INC-2026-001

## Blameless Summary

The 65-minute payment outage on 2026-04-14 was caused by a misconfigured database connection pool introduced in `svc-payment v1.4.2`. The AKCP agent correctly identified the issue from logs within 8 minutes of the alert firing and requested a rollback. The rollback required and received human approval, executing correctly and restoring service.

## Root Cause

`svc-payment v1.4.2` introduced a configuration change to the database pooler settings. A typo in the Kubernetes ConfigMap set `DB_POOL_MAX_CONNECTIONS=5` instead of `DB_POOL_MAX_CONNECTIONS=500`. Under normal traffic, 5 connections are sufficient for ~10 requests/second; the service handles ~2,000 requests/second in production, causing the pool to exhaust within minutes.

## Contributing Factors

1. The configuration change was not covered by staging tests (staging load is < 1% of production).
2. The deployment checklist did not include a post-deploy DB health check.
3. Connection pool utilization was not a monitored metric.

## Action Items

| Item                                                             | Owner             | Due Date   | Status      |
|------------------------------------------------------------------|-------------------|------------|-------------|
| Add pool config validation to CI                                 | payments-team     | 2026-05-01 | Completed   |
| Add canary stage with DB health validation                       | infra-team        | 2026-05-15 | In Progress |
| Alert on connection pool utilization > 80%                       | observability     | 2026-04-21 | Completed   |
| Update High CPU and DB runbooks with connection pool triage path | payments-team     | 2026-04-30 | Completed   |

## What the Agent Did Correctly

- Queried logs and correctly identified `connection pool exhausted` as the root cause within 8 minutes.
- Surfaced a rollback recommendation with the specific version to roll back to.
- Did **not** attempt to execute the rollback autonomously — correctly requested approval first.
- Audit log captured the full approval chain.

## Audit Evidence

- Approval event: `approval-004` granted by `alice@example.org` at `04:04 UTC`
- Capability invoked: `execute_remediation` (rollback)
- Audit log entry: `akcp.audit/v1` format, stored in `dist/audit-log.jsonl`
