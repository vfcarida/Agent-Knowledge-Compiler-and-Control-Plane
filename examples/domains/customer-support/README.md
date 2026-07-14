# Customer Support Flagship

> **Status:** Alpha

## Vision

Customer Support is the enterprise flagship demonstrating policy-aware, privacy-preserving support knowledge compilation. It shows how AKCP handles:
- Tickets and Customer History
- Support Macros
- SLA Policies
- PII Redaction
- Escalation Rules

## Architecture

This domain consists of:
- **`capabilities.json`**: MCP tools with strict schemas governing refund issuance, macro execution, and customer history retrieval. Note the use of `readsPII: true` and `requiresApproval: true`.
- **`akcp.yaml`**: The domain configuration mapping the OKF sources and configuring the Control Plane to redact sensitive fields (like SSNs and credit cards) and require HITL approvals for high-risk actions.
- **Knowledge Sources**:
  - `policies/`: Formal support policies (Refund Policy, Data Retention).
  - `macros/`: Executable support scripts (Delete Customer Data).
  - `knowledge-base/`: FAQs and help articles.

## Usage

To compile this domain into an agent-ready Context Pack and MCP manifest:

```bash
pnpm akcp compile --config examples/domains/customer-support/akcp.yaml
```

To see an agent walk through a simulated interaction using these policies, see the [Customer Support Walkthrough](WALKTHROUGH.md).
