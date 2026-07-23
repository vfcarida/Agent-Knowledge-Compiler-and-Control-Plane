# Customer Support Domain Walkthrough

> **Status:** Alpha
>
> **Note:** The Customer Support Flagship is currently an experimental readiness bridge. Its capabilities (like refunds) are skeletal placeholders to demonstrate policy-gated architecture and PII redaction.

This walkthrough outlines how an autonomous agent, equipped with the compiled Customer Support context pack and MCP resources, interacts with a simulated user while strictly adhering to the configured policies (PII redaction and HITL approvals).

## 1. Context and Tool Discovery

Upon initialization, the AKCP Profile Server provisions the agent with the support domain:

- **Context Loaded:** The agent reads the `Refund Policy`, `Data Retention Policy`, and the `Delete Customer Data` macro.
- **Tools Registered:** The agent receives the MCP tools: `get_customer_history`, `search_knowledge_base`, `issue_refund`, and `escalate_ticket`.

*Crucially, the Control Plane injects a `riskLevel` and intercepts any tools marked with `requiresApproval: true` or `readsPII: true`.*

## 2. A High-Risk Interaction (Refund Request)

**User Prompt:**
> "I want a refund for my digital subscription. I bought it yesterday."

1. **Agent searches context:** The agent uses `search_knowledge_base` with query "refund digital subscription".
2. **Policy evaluation:** The `Refund Policy` states that digital subscriptions are eligible within 14 days. The agent determines the user is eligible.
3. **Execution Blocked:** The agent attempts to call `issue_refund`. The AKCP Gateway intercepts the tool call because `issue_refund` is marked `requiresApproval: true` in `akcp.yaml`.
4. **HITL Triggered:** The system pauses the agent, generating an approval ticket ID. A human operator reviews the refund in the dashboard.
5. **Execution Resumed:** If approved, the gateway allows the tool call to complete.

## 3. A Privacy-Sensitive Interaction (GDPR Deletion)

**User Prompt:**
> "Delete my account and all my data under GDPR."

1. **Agent reads macro:** The agent matches the intent to the `Delete Customer Data` macro.
2. **Capability execution:** The agent invokes `delete_customer_data`.
3. **PII Redaction:** During execution, the agent must fetch the customer ID using `get_customer_history`. Because `get_customer_history` is marked with `readsPII: true`, the Control Plane automatically redacts any SSNs, emails, or credit card numbers returned before they hit the agent's context window, minimizing the blast radius if the agent were compromised.

## 4. Compile the domain yourself

```bash
pnpm akcp compile --config examples/domains/customer-support/akcp.yaml
```

The resulting `dist/agent-knowledge-ir.json` contains the cryptographically hashed, strictly typed definitions of all policies and tools, ready for the Control Plane.
