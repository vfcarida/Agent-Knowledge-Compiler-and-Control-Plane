---
schemaVersion: "okf/v1"
id: "alert-high-cpu-payment"
type: "Alert"
title: "Alert: High CPU — Payment Service"
description: "Fires when CPU utilization on svc-payment exceeds 90% for 5 consecutive minutes."
tags:
  - "alert"
  - "cpu"
  - "payments"
source: "Prometheus"
severity: "Critical"
serviceRef: "svc-payment"
---

# Alert: High CPU — Payment Service

## Condition

```
avg(rate(container_cpu_usage_seconds_total{service="svc-payment"}[5m])) > 0.90
for: 5m
```

## Impact

Sustained high CPU typically indicates either a traffic spike, a runaway process, or a regression in a recent deployment. Without mitigation, this escalates to degraded response times and eventually to a service-level incident.

## Runbook

See `runbook-high-cpu` for the detailed triage and remediation procedure.

## Escalation

If mitigation is not initiated within 10 minutes of the alert firing, L2 escalation (Engineering Lead) is triggered automatically per `escalation-policy-payments`.
