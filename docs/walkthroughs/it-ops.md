# Walkthrough: IT Operations / Incident Response Enterprise Flagship

> This walkthrough demonstrates AKCP as an enterprise **governed agent knowledge control plane** — not just a documentation compiler. You will triage an incident, surface a runbook, request approval for a remediation action, and verify the audit trail, all using only local tooling.

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Repository cloned: `git clone https://github.com/vfcarida/Agent-Knowledge-Compiler-and-Control-Plane`
- Monorepo built: `pnpm build`

---

## Step 1 — Validate the IT Operations Bundle

Ensure every document in the bundle passes schema validation before compiling.

```bash
pnpm akcp validate examples/domains/it-operations
```

**Expected output:**

```
✓ Validated 12 OKF documents
✓ Profile: it-operations
✓ No schema errors
ℹ Skipped 4 policy files (not OKF documents)
```

The validator checks each `.md` file against the `ITOperationsDomainSchema` Zod schema, enforcing required fields (`type`, `id`, `title`, `schemaVersion`) and domain-specific fields (`severity`, `status`, `serviceRef`, etc.).

---

## Step 2 — Compile the Domain into Agent Artifacts

The compiler reads the OKF source documents and emits four artifacts:

```bash
pnpm akcp compile --config examples/domains/it-operations/akcp.yaml
```

**Expected output:**

```
✓ Compilation complete

  Targets:
  → context-pack        dist/agent-knowledge-ir.json   (context pack, all documents)
  → mcp-resources       dist/mcp-resources.json         (MCP resource manifest)
  → openwiki            dist/openwiki/                  (OpenWiki-compatible docs)
  → dashboard-metadata  dist/dashboard-meta.json        (dashboard signal)

  Conformance: AKCP-control-plane-compatible
  Capabilities validated: 5
  Policy files linked: 2
```

---

## Step 3 — Inspect the Context Pack

The context pack is the compiled artifact consumed by agents during runtime. Inspect it to understand what knowledge is available:

```bash
pnpm akcp inspect examples/domains/it-operations/dist/agent-knowledge-ir.json
```

**Expected output (excerpt):**

```
AKCP Context Pack — IT Operations
  Documents: 12
  Document types:
    Service          2
    Owner            1
    SLO              1
    EscalationPolicy 1
    ChangeWindow     1
    Alert            1
    Runbook          2
    RemediationAction 1
    Incident         1
    Postmortem       1

  Capabilities: 5
    it-operations.query_logs           [low]
    it-operations.get_runbook          [low]
    it-operations.create_incident      [medium]
    it-operations.escalate_incident    [medium, approval-required]
    it-operations.execute_remediation  [critical, approval-required]
```

---

## Step 4 — Simulate an Incident Triage Session

The following walkthrough simulates what an agent integrated with this bundle would do during a real SEV-2 incident.

### Scenario: High CPU on Payment Service

**Alert fires:**
```
ALERT: alert-high-cpu-payment
Service: svc-payment
CPU: 94% (5-minute average)
Severity: Critical
```

**Agent behavior (governed by AKCP control plane):**

1. **Agent calls `get_runbook`** (low risk, no approval needed):
   ```json
   { "runbookId": "runbook-high-cpu" }
   ```
   Response: Full content of `runbooks/high-cpu.md`.

2. **Agent calls `query_logs`** (low risk, no approval needed):
   ```json
   {
     "serviceName": "svc-payment",
     "query": "error OR deployment",
     "startTime": "2026-07-14T10:00:00Z",
     "endTime": "2026-07-14T10:30:00Z"
   }
   ```
   Response: Deployment event found — `svc-payment v1.4.2` deployed at `10:22 UTC`.

3. **Agent surfaces remediation plan** (does NOT execute):
   ```
   I found a recent deployment (v1.4.2 at 10:22 UTC) that coincides with the CPU spike.

   Based on runbook-high-cpu (Path B — Bad Deployment), I recommend rolling back to v1.4.1.

   ⚠️ This action requires your approval.
   Capability: execute_remediation
   Risk Level: Critical
   Action: rollback_deployment (svc-payment v1.4.1)

   Please approve this action to proceed.
   ```

4. **Human approves** (out-of-band, returns `approvalTicketId: approval-005`).

5. **Agent calls `execute_remediation`** (approval-gated):
   ```json
   {
     "remediationActionId": "remediation-rollback-deployment",
     "serviceRef": "svc-payment",
     "targetVersion": "v1.4.1",
     "approvalTicketId": "approval-005"
   }
   ```

6. **AKCP control plane logs the audit event:**
   ```jsonl
   {"schemaVersion":"akcp.audit/v1","capability":"it-operations.execute_remediation","action":"rollback_deployment","approvedBy":"alice@example.org","approvedAt":"2026-07-14T10:34:00Z","executedAt":"2026-07-14T10:34:05Z","status":"success"}
   ```

---

## Step 5 — Verify the Approval Guard

Attempt to call `execute_remediation` **without an approval ticket**. The control plane blocks it:

```bash
# This simulates an unapproved execution attempt
echo '{"remediationActionId":"remediation-rollback-deployment","serviceRef":"svc-payment","targetVersion":"v1.4.1"}' \
  | pnpm akcp simulate-capability it-operations.execute_remediation
```

**Expected output:**

```
✗ Execution blocked

  Capability: it-operations.execute_remediation
  Reason: approvalTicketId is required for this capability (riskLevel: critical)
  Policy: execute_remediation.policy.yaml
  Control plane: disableDangerousTools = true

  The agent MUST request human approval before proceeding.
```

---

## Step 6 — Review the Audit Log

After an approved execution, verify the audit trail:

```bash
cat examples/domains/it-operations/dist/audit-log.jsonl | jq .
```

**Expected output:**

```json
{
  "schemaVersion": "akcp.audit/v1",
  "capability": "it-operations.execute_remediation",
  "action": "rollback_deployment",
  "serviceRef": "svc-payment",
  "approvedBy": "alice@example.org",
  "approvedAt": "2026-07-14T10:34:00Z",
  "executedAt": "2026-07-14T10:34:05Z",
  "status": "success"
}
```

> **Security**: The audit log is checked by AKCP to ensure it never contains `credential`, `password`, `secret`, or `token` strings. Violations block the write operation.

---

## Step 7 — Post-Incident Knowledge Update

After the incident resolves, link the postmortem to keep the knowledge bundle up to date:

```bash
pnpm akcp compile --config examples/domains/it-operations/akcp.yaml
```

The postmortem `incidents/postmortem-2026-001.md` is automatically included in the context pack. Future agent sessions will use this as grounded knowledge to avoid the same class of error.

---

## Step 8 — Run the Eval Suite

Validate that an agent integrated with this bundle behaves correctly across all incident scenarios:

```bash
pnpm akcp eval --config examples/domains/it-operations/evals/it-operations.yaml
```

**Expected output:**

```
IT Operations Evaluation Suite
  Scenarios: 7
  ✓ triage-identify-runbook
  ✓ safe-recommendation-approval-block
  ✓ rollback-approval-path
  ✓ audit-event-generation
  ✓ postmortem-knowledge-update
  ✓ classify-action-risk
  ✓ context-budget-adherence

  Result: 7/7 passed
```

---

## Summary: What AKCP Proves Here

| Claim                                      | Evidence                                          |
|--------------------------------------------|---------------------------------------------------|
| AKCP is not just a doc compiler            | Capabilities, policies, and approvals are enforced |
| Agents can be grounded in operational knowledge | Context pack includes runbooks, SLOs, escalation policies |
| Dangerous actions are never autonomous     | `execute_remediation` blocked without approval ticket |
| Decisions are auditable                    | Every approval + execution written to `akcp.audit/v1` |
| Post-incident learning closes the loop     | Postmortem feeds back into next compilation        |
| Evals make quality measurable              | 7 eval scenarios cover the full incident lifecycle |

---

## Related

- [IT Operations README](../../examples/domains/it-operations/README.md)
- [Career Starter Domain Walkthrough](./career.md)
- [OKF Specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf)
- [MCP Specification](https://modelcontextprotocol.io/)
