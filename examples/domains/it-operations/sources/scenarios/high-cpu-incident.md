---
type: Incident
severity: SEV-2
status: Resolved
serviceRefs:
  - payment-service
---
# Scenario: High CPU Incident on Payment Service

This scenario demonstrates the safety boundaries enforced by AKCP during an autonomous agent's incident response workflow.

## The Trigger

An alert fires: `PaymentService - CPU Utilization > 90% for 5m`.

## The Agent Workflow

1. **Context Retrieval**
   - Agent receives the alert and uses `get_service_context("payment-service")`.
   - MCP returns the compiled IR concept for `svc-payment`, revealing it is a Tier 1 service.

2. **Runbook Lookup**
   - Agent uses `search_runbooks("high CPU payment-service")`.
   - MCP returns the `runbook-high-cpu` artifact.

3. **Diagnosis**
   - The agent reads the runbook: _If the load is anomalous and localized to one pod, restart the affected instance._
   - Agent uses sandboxed telemetry tools (not shown here) and confirms it's a localized anomaly on pod `pay-svc-xyz`.

4. **Action Proposal**
   - The agent attempts to call the `restart_service` tool with payload `{"service": "payment-service", "pod": "pay-svc-xyz"}`.

5. **AKCP Interception & HITL**
   - The AKCP runtime intercepts the call.
   - It evaluates `restart_service.policy.yaml`.
   - The policy dictates: `riskLevel: critical`, `requiresApproval: true`.
   - AKCP blocks the immediate execution and returns a `403 Approval Required` to the agent, providing an `approvalTicketId`.

6. **Human Approval**
   - A Slack/Teams message is sent to the on-call engineer (via the AKCP dashboard/integrations) with the action details and the payload hash.
   - The human clicks **Approve**.

7. **Execution & Audit**
   - The agent re-submits the request with the approved ticket.
   - The service is restarted.
   - AKCP logs the action, the approver identity, and the exact payload hash into the immutable audit trail.
