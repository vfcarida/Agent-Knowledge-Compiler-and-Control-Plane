---
schemaVersion: "okf/v1"
id: "inc-2026-002"
type: "Incident"
title: "SEV-2: Payment Service High CPU — Suspected Deployment Regression"
description: "Elevated CPU on svc-payment following a deployment. Triaged and mitigated via rollback."
tags:
  - "sev-2"
  - "payments"
  - "cpu"
severity: "SEV-2"
status: "Resolved"
serviceRefs:
  - "svc-payment"
commanderRef: "owner-team-payments"
startTime: "2026-07-10T14:30:00Z"
endTime: "2026-07-10T15:12:00Z"
---

# INC-2026-002 — Payment Service High CPU

## Impact Summary

- **Duration**: 42 minutes
- **Scope**: Elevated P99 latency (450ms vs 80ms baseline); no transaction failures
- **SLO Impact**: 4.2 minutes of error-budget burned (availability maintained)

## Timeline

| Time (UTC) | Event                                                                         |
|------------|-------------------------------------------------------------------------------|
| 14:25      | Deployment of `svc-payment v1.4.3` completed                                 |
| 14:30      | Monitoring alert: CPU > 90% for 5 minutes on `svc-payment`                   |
| 14:32      | On-call engineer acknowledged alert                                           |
| 14:34      | AKCP agent called `get_runbook(runbook-high-cpu)` — retrieved runbook         |
| 14:36      | AKCP agent called `query_logs` — identified deployment event at 14:25         |
| 14:38      | Agent proposed rollback to v1.4.2. **Approval requested.**                   |
| 14:40      | On-call lead approved rollback (approvalTicketId: approval-007)               |
| 14:40      | AKCP logged: `approval-007 granted by bob@example.org`                        |
| 14:41      | Rollback to v1.4.2 executed. CPU began recovering.                            |
| 14:52      | CPU returned to baseline (65%). Incident monitoring period started.           |
| 15:12      | Incident resolved after stable monitoring period.                             |

## Runbooks Applied

- `runbook-high-cpu` (Path B — Bad Deployment)

## Capability Audit

| Capability                          | Approved | Ticket       |
|-------------------------------------|----------|--------------|
| `it-operations.get_runbook`         | N/A      | N/A          |
| `it-operations.query_logs`          | N/A      | N/A          |
| `it-operations.execute_remediation` | Yes      | approval-007 |
