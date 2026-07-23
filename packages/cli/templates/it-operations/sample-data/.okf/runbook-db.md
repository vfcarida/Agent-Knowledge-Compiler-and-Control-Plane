---
schemaVersion: "okf/v1"
id: "runbook-db-failover"
type: "Runbook"
title: "Database Failover Runbook"
description: "Emergency procedure for failing over the primary PostgreSQL cluster to a read replica."
tags:
  - "database"
  - "failover"
  - "sev-1"
serviceRef: "svc-payment"
severity: "SEV-1"
lastTested: "2026-06-15"
---

# Database Failover Runbook

**Trigger**: Primary database connection timeouts > 5s, or CPU utilization > 90% sustained.

## Symptoms

- Connection timeouts > 5s across all services using the primary PostgreSQL cluster
- High CPU utilization on the primary database node > 90%
- Error logs show `too many connections` or `connection refused`

## Mitigation Steps

1. **Announce** the incident in `#incidents` Slack channel.
2. **Query logs** (no approval needed) to confirm replica sync status is within acceptable lag.
3. **Propose failover**: Agent surfaces the failover action for approval.
   - Capability: `execute_remediation`
   - Risk Level: Critical
   - **Requires explicit human approval**
4. **Upon approval**, execute the failover to `replica-1`.
5. **Monitor** replica health for 5 minutes — confirm write latency and connection pool metrics are normal.
6. **Open incident** record: `inc-YYYY-NNN` linking to this runbook.
