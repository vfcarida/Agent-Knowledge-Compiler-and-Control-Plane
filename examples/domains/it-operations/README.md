# IT Operations / Incident Response — Enterprise Flagship Domain

This domain demonstrates AKCP's full capability set:

- **Knowledge Compilation**: Runbooks, incident procedures, and postmortems compiled into structured IR
- **Policy Governance**: Side-effect policies requiring HITL approval for remediation actions
- **Capability Registry**: Tools for diagnosis, remediation, escalation with strict boundaries
- **Eval Scenarios**: Test that the agent correctly follows incident response procedures

---

## Domain Structure

- `sources/`: The raw OKF-compatible source markdown files (Services, Runbooks, Incidents, Scenarios).
- `capabilities/`: The MCP tools associated with this domain.
- `policies/`: The policies enforcing that remediation actions are strictly gated by human approval.
- `evals/`: The baseline evaluation dataset to test agent accuracy on this domain.
- `expected-output/`: Golden output snapshots from successful compile/serve.
- `akcp.yaml`: The compiler configuration bundle mapping sources to targets.

## Expected Outputs

Once compiled, you can expect:
- A `context-pack.json` (AK-IR) containing the parsed and budgeted OKF documents.
- An `mcp-resources.json` for MCP resource serving.
- A static HTML OpenWiki in `dist/openwiki`.
- A dashboard metadata file in `dist/dashboard-meta.json`.

---

## Commands

Follow the steps in [Walkthrough](walkthrough.md), or run these quick commands:

```bash
# 1. Validate the knowledge bundle
pnpm akcp validate --bundle examples/domains/it-operations --profile it-operations

# 2. Compile the bundle into Agent Knowledge IR (AK-IR)
pnpm akcp compile --config examples/domains/it-operations/akcp.yaml

# 3. Serve the bundle as MCP resources
pnpm akcp serve mcp --profile it-operations
```

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

## Files mapped in Sources

| Document Type       | Purpose |
|---------------------|---------|
| Service             | Describes a microservice boundaries |
| Owner               | Defines the owning team |
| SLO                 | Defines the Service Level Objective |
| EscalationPolicy    | Escalation path mapping |
| ChangeWindow        | Allowed deployment windows |
| Alert               | Mapping metrics to alerts |
| Runbook             | Mitigation steps for alerts |
| RemediationAction   | Automated commands for mitigation |
| Incident            | Historical incident record |
| Postmortem          | Post-incident review document |
