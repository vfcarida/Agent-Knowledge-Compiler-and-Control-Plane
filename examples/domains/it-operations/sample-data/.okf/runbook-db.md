---
type: Runbook
id: rb-db-failover
service: primary-database
severity: sev-1
lastTested: '2026-06-15'
---

# Database Failover Runbook

## Symptoms
- Connection timeouts > 5s
- High CPU utilization on primary > 90%

## Mitigation Steps
1. Announce incident in #incidents channel.
2. Execute `execute_runbook` with args `{"script": "failover.sh", "target": "replica-1"}`.
3. Monitor replica health for 5 minutes.
