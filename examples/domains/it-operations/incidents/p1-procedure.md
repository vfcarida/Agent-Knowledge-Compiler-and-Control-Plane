---
id: "proc-p1-incident"
type: "IncidentProcedure"
title: "P1 Incident Procedure"
severity: "P1"
---

# P1 Incident Procedure

A P1 incident indicates a total outage of a core critical service, affecting >10% of users.

## Steps

1. **Acknowledge**: On-call engineer must acknowledge within 5 minutes.
2. **Bridge**: Automatically create a war-room meeting bridge.
3. **Communication**: Issue an initial statuspage update within 15 minutes.
4. **Investigation**: Use agent-assisted tools to pull logs, runbooks, and recent changes.
5. **Mitigation**: Prefer rollback over fixing forward. Approval limits are bypassed in P1 scenarios (unless blocked by Policy Cards).
