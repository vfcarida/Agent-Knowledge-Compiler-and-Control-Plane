# IT Operations / Incident Response — Enterprise Flagship Domain

> **This is the enterprise flagship domain for AKCP.**
>
> It demonstrates how AKCP's governance, policy-gated approvals, audit evidence, and MCP capabilities function in a real-world operational context: incident triage, safe remediation, escalation, and post-incident learning.

---

## What This Domain Demonstrates

| Capability                       | Demonstrated By                                    |
|----------------------------------|----------------------------------------------------|
| Incident triage via context      | Agent retrieves runbooks via `get_runbook`         |
| Safe recommendation              | Agent suggests rollback without executing it       |
| Approval-gated remediation       | `execute_remediation` blocked until ticket approved |
| Audit trail generation           | Every approval + execution logged in `akcp.audit/v1` |
| Escalation policy enforcement    | `escalate_incident` requires approval for L2+      |
| Post-incident knowledge update   | Postmortem document feeds back into the bundle     |
| Context budget adherence         | Eval scenario validates agent summarizes, not dumps |

---

## Domain Model

```
System (sys-commerce)
  └── Service (svc-payment)
        ├── Owner (owner-team-payments)
        ├── SLO (slo-payment-availability)
        ├── EscalationPolicy (escalation-policy-payments)
        ├── ChangeWindow (change-window-payments)
        ├── Alert (alert-high-cpu-payment)
        └── Runbooks
              ├── runbook-high-cpu
              └── runbook-failed-deploy
                    └── RemediationAction (remediation-rollback-deployment)
  └── Service (svc-auth)
        └── Owner (owner-team-security)

Incidents
  └── inc-2026-001 (SEV-1, Closed)
        └── postmortem-2026-001

Policies
  ├── incident-response.policy.yaml  (master policy)
  ├── execute_remediation.policy.yaml
  ├── restart_service.policy.yaml
  ├── deploy_service.policy.yaml
  └── execute_command.policy.yaml
```

---

## Quick Start

### 1. Validate the Domain Bundle

```bash
pnpm akcp validate examples/domains/it-operations
```

Expected output:
```
✓ Validated 14 documents
✓ Profile: it-operations
✓ No schema errors
```

### 2. Compile the Domain

```bash
pnpm akcp compile --config examples/domains/it-operations/akcp.yaml
```

Expected output:
```
✓ Compilation complete
  → dist/agent-knowledge-ir.json  (context pack)
  → dist/mcp-resources.json       (MCP resources)
  → dist/openwiki/                (OpenWiki docs)
  → dist/dashboard-meta.json      (dashboard metadata)
```

### 3. Inspect the Context Pack

```bash
pnpm akcp inspect examples/domains/it-operations/dist/agent-knowledge-ir.json
```

### 4. Review the Walkthrough

See [docs/walkthroughs/it-ops.md](../../../docs/walkthroughs/it-ops.md) for the full end-to-end tutorial including:

- Starting the MCP Profile Server
- Simulating an incident triage session
- Requesting and approving a remediation action
- Verifying the audit log

---

## Capabilities

| Capability ID                          | Risk     | Approval Required | Side Effects      |
|----------------------------------------|----------|-------------------|-------------------|
| `it-operations.query_logs`             | Low      | No                | Read (logs)       |
| `it-operations.get_runbook`            | Low      | No                | None              |
| `it-operations.create_incident`        | Medium   | No                | Write (record)    |
| `it-operations.escalate_incident`      | Medium   | Yes               | External write    |
| `it-operations.execute_remediation`    | Critical | **Yes**           | External write    |

---

## Safety Guarantees

- **No real credentials** appear anywhere in this domain.
- **No real production endpoints** are called. All remediation scripts are simulated.
- **Destructive actions** (`execute_remediation`, `restart_service`) are permanently blocked by the AKCP control plane unless a valid `approvalTicketId` is presented.
- **Log scrubbing** is enforced: `credential`, `password`, `secret`, `token` strings are blocked from audit logs.

---

## Evaluation Scenarios

The `evals/it-operations.yaml` file contains 7 evaluation scenarios:

1. Triage — identify the correct runbook for a CPU spike
2. Safety — block remediation without approval
3. Rollback — propose rollback, await approval, never self-execute
4. Audit — confirm audit event after approved execution
5. Postmortem — surface root cause and action items after incident resolution
6. Risk classification — accurately rate capability risk levels
7. Context budget — summarize, not dump

---

## Files

| Path                                        | Document Type       |
|---------------------------------------------|---------------------|
| `services/payment-service.md`               | Service             |
| `services/auth-service.md`                  | Service             |
| `services/owner-team-payments.md`           | Owner               |
| `services/slo-payment-availability.md`      | SLO                 |
| `services/escalation-policy-payments.md`    | EscalationPolicy    |
| `services/change-window-payments.md`        | ChangeWindow        |
| `services/alert-high-cpu-payment.md`        | Alert               |
| `runbooks/high-cpu.md`                      | Runbook             |
| `runbooks/failed-deploy.md`                 | Runbook             |
| `runbooks/remediation-rollback-deployment.md` | RemediationAction |
| `incidents/inc-2026-001.md`                 | Incident            |
| `incidents/postmortem-2026-001.md`          | Postmortem          |
| `policies/incident-response.policy.yaml`    | Policy              |
| `policies/execute_remediation.policy.yaml`  | Policy              |
| `evals/it-operations.yaml`                  | Eval dataset        |
