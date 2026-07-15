---
schemaVersion: "okf/v1"
id: "runbook-failed-deploy"
type: "Runbook"
title: "Failed Deployment Runbook — Rollback Procedure"
description: "Procedure for rolling back a failed deployment to any Tier-1 service."
tags:
  - "deployment"
  - "rollback"
  - "incident"
serviceRef: "svc-payment"
alertRefs:
  - "alert-error-rate-spike"
severity: "SEV-1"
lastTested: "2026-06-20"
---

# Failed Deployment Runbook — Rollback Procedure

**Trigger**: Error rate spike (> 5x baseline) within 30 minutes of a production deployment.

> **Safety**: Rollback execution via the `execute_remediation` capability **always requires explicit human approval**. The agent can prepare and stage the rollback but cannot execute it autonomously.

## Triage Steps

1. **Confirm the deployment** using `query_logs` for recent deployment events.
2. **Check error rates** for the last 30 minutes. If errors started within 5 minutes of the deployment, assume causation.
3. **Identify the previous stable version** from the deployment history.

## Rollback Decision Tree

```
Is error rate > 5x baseline?
  ├── Yes → Proceed to rollback (approval required)
  └── No  → Continue monitoring, create tracking issue
```

## Rollback Steps (Approval Required)

1. Agent surfaces rollback plan: "Roll back `svc-payment` from `v1.4.2` to `v1.4.1`?"
2. On-call lead reviews and **approves** the action.
3. The approval and timestamp are recorded in the AKCP audit log.
4. Rollback executes; progress is streamed back to the incident bridge.
5. Monitor for 10 minutes. Confirm error rates return to baseline.

## Safe / Unsafe Boundary

| Action                  | Requires Approval | Risk     |
|-------------------------|-------------------|----------|
| Query deployment history| No                | Low      |
| Stage rollback plan     | No                | Low      |
| Execute rollback        | **Yes**           | Critical |

## Post-Incident

- Create a postmortem within 48 hours.
- Add the regression pattern to the eval dataset (`evals/`).
- Update deployment pipeline checks to prevent recurrence.
