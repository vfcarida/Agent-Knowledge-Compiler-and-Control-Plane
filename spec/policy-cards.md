# Policy Cards Specification

> **Status:** DRAFT — v0.1.0-draft  
> **Spec Section:** POLICY-1  
> **Related Research:** [Policy Cards paper](https://arxiv.org/abs/2510.24383), [AAGATE](https://arxiv.org/abs/2510.25863)

## 1. Introduction

A Policy Card is a machine-readable document that expresses runtime governance constraints for autonomous AI agents. It is the primary mechanism by which AKCP enforces security, compliance, and operational boundaries over agent behavior.

## 2. Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHOULD", "RECOMMENDED", and "MAY" in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## 3. Policy Card Schema

A Policy Card is a YAML file named `.policy.yaml` located at the root of an AKCP bundle.

```yaml
# Required
policyVersion: "1.0"
defaultAutonomyLevel: "read-only" # read-only | read-write | autonomous

# Optional
rules:
  - id: "rule-001"
    description: "Block access to PII fields."
    effect: "deny"
    resource: "field:pii.*"
    action: "*"

  - id: "rule-002"
    description: "Allow read access to architecture docs."
    effect: "allow"
    resource: "node:type:document"
    action: "read"

requireApprovalFor:
  - "execute_command"
  - "modify_database"

piiHandling: "mask"  # mask | redact | passthrough
```

## 4. Autonomy Levels

| Level | Description |
|-------|-------------|
| `read-only` | Agent may only retrieve information. No side-effects permitted. |
| `read-write` | Agent may call tools that produce side-effects with no approval gate. |
| `autonomous` | Agent may take autonomous multi-step actions. High-risk. Requires explicit escalation. |

## 5. Enforcement

A AKCP-compliant control plane MUST enforce Policy Cards at the MCP Gateway boundary:

1. Before forwarding any MCP tool call, the gateway MUST evaluate all applicable rules in order.
2. If a `deny` rule matches, the call MUST be blocked and the reason logged.
3. If `requireApprovalFor` contains the tool name, a Human-in-the-Loop (HITL) approval MUST be solicited before execution.
4. The gateway MUST log all decisions, including the matching rule ID, to an immutable audit log.

## 6. Inheritance

A bundle's Policy Card MAY extend a parent Policy Card using the `extends` key:

```yaml
extends: "https://example.com/enterprise-default.policy.yaml"
```

Local rules take precedence over inherited rules.
