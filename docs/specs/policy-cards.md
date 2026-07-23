# Policy Cards

To enforce runtime governance constraints safely and reliably, `akcp` supports machine-readable **Policy Cards**. A policy card allows platform engineers and security teams to restrict the autonomy level of agents, limit their tool usage, enforce explicit human-in-the-loop approvals, and map these controls directly to standard security frameworks like the NIST AI RMF and OWASP Top 10 for LLMs.

## Anatomy of a Policy Card

Policy Cards are defined as YAML files.

```yaml
apiVersion: policy.akcp.dev/v1alpha1
kind: PolicyCard
metadata:
  name: Strict Enterprise Governance
  description: Highly restrictive policy for sensitive operations.
  version: 1.0.0
spec:
  allowedAgents:
    - "trusted-automation-agent"
  allowedContextPacks:
    - "compliance"
  allowedTools:
    - "read_document"
  forbiddenTools:
    - "delete_document"
  sideEffectRules:
    read: audit
    write: deny
    submit: deny
  approvalRequirements:
    - "*"
  piiHandling: deny
  evidenceRequirements:
    - "Full session recording"
  mappings:
    nist_ai_rmf:
      - GOVERN 1.1
    owasp_llm:
      - LLM06: Excessive Agency
```

### Spec Fields

- **allowedAgents**: List of agent identities allowed to operate under this policy. Use `*` for all.
- **allowedContextPacks**: Restrict the contexts that can be mounted.
- **allowedTools** / **forbiddenTools**: Allow-list and block-list of MCP tools.
- **maxContextBudget**: (Optional) Enforce a maximum context window limit to control costs.
- **sideEffectRules**:
  - Define rules for `read`, `write`, and `submit` operations. Valid values: `allow`, `deny`, `audit`, `approval`.
- **approvalRequirements**: Tools that strictly require a cryptographic HITL approval token to execute.
- **piiHandling**: Dictates how PII should be handled: `deny`, `redact`, or `allow-with-audit`.
- **evidenceRequirements**: Additional compliance logs that must be emitted (e.g. "JIRA Ticket ID").
- **mappings**: Links policy controls back to enterprise governance frameworks.

## CLI Commands

- **Validate a Policy**: `npx akcp policy validate policies/strict-enterprise.policy.yaml`
- **Explain a Policy**: `npx akcp policy explain policies/strict-enterprise.policy.yaml`

## MCP Enforcement

When the `mcp-automation-server` initializes with a policy, every single tool call is passed through the evaluation engine. If a tool violates the allowed tools, autonomy boundary, or side-effect rules, it will instantly throw an error mapped to `[LLM06: Excessive Agency]`.
