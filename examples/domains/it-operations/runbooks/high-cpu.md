---
id: "runbook-high-cpu"
type: "Runbook"
title: "High CPU Runbook"
tags: ["cpu", "performance", "incident"]
relatedServices:
  - "svc-payment"
  - "svc-auth"
---

# High CPU Runbook

When a service reports CPU > 90% for more than 5 minutes, follow this procedure.

## 1. Triage

- Check the current load and request rate using the monitoring dashboard.
- Verify if a recent deployment caused the spike.

## 2. Mitigation

- If the load is legitimate and sustained, scale up the service replica count.
- If the load is anomalous and localized to one pod, restart the affected instance using the `restart_service` capability.
- If caused by a bad deployment, execute the Rollback Plan immediately.
