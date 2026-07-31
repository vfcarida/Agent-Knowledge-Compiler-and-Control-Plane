# Policy Engine Integration Guide

## Default: Internal Engine

The canonical, wired-in policy engine is `packages/core/src/policies/engine.ts`
(`evaluatePolicies`/`evaluatePoliciesWithTrace`), reached from `MCPGateway.execute()`
(`packages/core/src/capabilities/gateway.ts`) via `packages/core/src/policies/adapter.ts`'s
`adaptPolicyCardToRules`. There is also a standalone `policy/evaluate.ts` (singular) exporting
`evaluatePolicy`, which evaluates a `PolicyCard` directly with its own V1/V2 rule matching —
it has its own test coverage but is **not** in the `MCPGateway` request path; don't confuse the
two when extending policy enforcement.

AKCP ships with a built-in policy engine that supports:

- Priority-based rule evaluation
- Glob matching for tools
- Time-window conditions
- HITL obligation triggers
- Strict conflict detection and resolution

**Conflict Resolution Strategy**: When multiple conflicting policies apply to the same resource, the internal engine relies on the `priority` field defined in the policy rules. The engine evaluates policies in descending priority order. If a direct contradiction is detected between rules of the same priority, the evaluation immediately throws an `UnresolvablePolicyConflictError` and halts to ensure safe, secure defaults.

For most deployments, this built-in behavior is sufficient to govern Agent operations.

## Enterprise: External Policy Engines

For organizations with existing policy infrastructure, AKCP supports
delegating policy decisions to external engines via the PolicyProvider interface.

### OPA (Open Policy Agent)

```yaml
# akcp.yaml
policy:
  provider: opa
  opa:
    url: http://localhost:8181/v1/data/akcp/allow
    timeout: 100ms
    fallback: deny # if OPA is unreachable
```

Status: Planned (interface defined, implementation tracked in #XX)

### Cedar (AWS Verified Permissions)

```yaml
policy:
  provider: cedar
  cedar:
    policyStoreId: ps-xxxxx
    region: us-east-1
```

Status: Planned

### OpenFGA

```yaml
policy:
  provider: openfga
  openfga:
    apiUrl: http://localhost:8080
    storeId: xxxxx
```

Status: Planned

## Implementing a Custom Provider

Implement the `PolicyProvider` interface:

```typescript
import { PolicyProvider, PolicyRequest, PolicyDecision } from '@akcp/core';

export class MyProvider implements PolicyProvider {
  async evaluate(request: PolicyRequest): Promise<PolicyDecision> {
    // Your logic here
  }
  async reload(source: PolicySource): Promise<void> { ... }
  async healthy(): Promise<boolean> { ... }
}
```

Register in config:

```yaml
policy:
  provider: custom
  custom:
    module: "./my-policy-provider.js"
```
