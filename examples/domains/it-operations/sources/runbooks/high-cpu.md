---
schemaVersion: "okf/v1"
id: "runbook-high-cpu"
type: "Runbook"
title: "High CPU Runbook — Payment Service"
description: "Remediation steps for sustained high CPU utilization on the Payment Service."
tags:
  - "cpu"
  - "performance"
  - "payments"
  - "incident"
serviceRef: "svc-payment"
alertRefs:
  - "alert-high-cpu-payment"
severity: "SEV-2"
lastTested: "2026-06-15"
---

# High CPU Runbook — Payment Service

**Trigger**: CPU utilization > 90% sustained for 5+ minutes on `svc-payment`.

## Triage Steps

1. **Confirm the alert** is not a monitoring false positive by checking the real-time metrics dashboard.
2. **Check for a recent deployment** using `query_logs` to inspect deployment events in the last 30 minutes.
3. **Identify the top processes** by pulling the last 5 minutes of CPU profiling samples.
4. **Examine request rates**: Are request volumes above the expected baseline? Is there a traffic spike or a slow-processing loop?

## Mitigation Paths

### Path A — Traffic Spike (Legitimate Load)

If request volume is elevated but processing looks normal:

1. Scale out replicas (this is a **read operation** and can be suggested by the agent without approval).
2. Notify the team in `#ops-payments`.
3. Monitor for 10 minutes to confirm stabilization.

### Path B — Bad Deployment (Regression)

If a deployment was made in the last 60 minutes:

1. Agent suggests a rollback. **This requires human approval** via the `execute_remediation` capability.
2. Approval is sought from the on-call lead via `escalation-policy-payments`.
3. Once approved, rollback is executed and logged in the audit trail.

### Path C — Runaway Process (Anomaly)

If an isolated pod is consuming excessive CPU:

1. Agent can **suggest** restarting the pod.
2. **Execution of `restart_service` requires approval** — the agent will surface this for the on-call engineer to confirm.
3. After restart, watch error rates and CPU metrics for 5 minutes.

## Safe / Unsafe Boundary

| Action                  | Requires Approval | Risk   |
|-------------------------|-------------------|--------|
| Query logs              | No                | Low    |
| Scale replicas (suggest)| No (suggest only) | Medium |
| Restart pod             | **Yes**           | High   |
| Rollback deployment     | **Yes**           | Critical |

## Post-Incident

- Open a postmortem if impact lasted > 15 minutes or SLO error budget was burned.
- Update this runbook if root cause was not covered by existing paths.
