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
      - LLM08: Excessive Agency
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

### Scoping rules by capability and risk level (`appliesTo` + `rules`)

For policies that only need to allow/deny/require-approval for a specific set
of capabilities (optionally narrowed to specific risk levels), a Policy Card
can use `appliesTo` + `rules` instead of (or alongside) `spec`:

```yaml
apiVersion: policy.akcp.dev/v1alpha1
kind: PolicyCard
metadata:
  name: Deny critical-risk actions
appliesTo:
  capabilities: ["*"]
  riskLevels: ["critical"]
rules:
  - effect: deny
```

- **appliesTo.capabilities**: Capability/tool IDs this rule set applies to. Supports `*` and trailing-`*` glob prefixes.
- **appliesTo.riskLevels**: (Optional) Narrows the rule set to only fire when the invoked capability's declared `riskLevel` is in this list. Omit to match any risk level. The capability's risk level must actually reach policy evaluation — see `CapabilityRequest.riskLevel` in `capabilities/request.ts`; MCP servers that don't pass it fall back to `"medium"`.
- **rules[].effect**: `allow`, `deny`, or `require_approval`.
- **rules[].condition**: Evaluated at runtime by both the policy engine (`policies/adapter.ts` -> `policies/engine.ts`) and the standalone evaluator (`policy/evaluate.ts`). Can be specified as a string expression or structured condition object/array:
  - `time_window`: Enforces allowed hours (e.g. `"time_window(startHour=9, endHour=17)"` or `"time_window: 9-17"`).
  - `environment`: Matches target deployment environment (e.g. `"environment == 'production'"` or `"environment: staging"`).
  - `approval_exists`: Requires a valid approval token (e.g. `"approval_exists"`).
  - `custom`: Forward-compatible pass-through condition.
  - Compound conditions can be combined using `&&` or `AND` (e.g. `"environment == 'production' && approval_exists"`).
  - Unknown or unsupported condition types fail closed (deny).

## CLI Commands

- **Validate a Policy**: `npx akcp policy validate policies/strict-enterprise.policy.yaml`
- **Explain a Policy**: `npx akcp policy explain policies/strict-enterprise.policy.yaml`

## MCP Enforcement

When the `mcp-automation-server` initializes with a policy, every single tool call is passed through the evaluation engine. If a tool violates the allowed tools, autonomy boundary, or side-effect rules, it will instantly throw an error mapped to `[LLM08: Excessive Agency]` (OWASP Top 10 for LLM Applications 2023 numbering — see [docs/governance/owasp-llm-controls.md](../governance/owasp-llm-controls.md)).
