# `akcp.yaml` Reference

The `akcp.yaml` file is the declarative build specification and desired-state contract for the Agent Knowledge Compiler and Control Plane.

By defining an `akcp.yaml` file at the root of your project, you shift from imperatively building the Knowledge IR to a declarative _Control Plane_ approach, ensuring reproducibility, validation, and policy compliance.

## Structure Overview

The file is divided into two primary sections:

- `compile`: Defines build-time behaviors (where to find markdown, how to build the IR, context budgets).
- `controlPlane`: Defines runtime behaviors (governance policies, MCP server configurations, evaluation gates).

### 1. `compile`

Controls how the Agent Knowledge Compiler generates the Intermediate Representation (IR).

```yaml
compile:
  sources:
    - path: "./sample-data/.okf"
      format: "okf/markdown"
      exclude:
        - "**/drafts/**"
  target:
    format: "ir/json"
    out: "./dist/knowledge-ir.json"
  budgets:
    maxTokens: 500000
    maxDocuments: 1000
```

- **`sources`**: Array of source paths containing the OKF Markdown documents. Supports `exclude` patterns.
- **`target`**: Where to output the compiled knowledge-ir.json.
- **`budgets`**: Prevents runaway context sizes. If the compilation exceeds `maxTokens` or `maxDocuments`, the build will fail.

### 2. `controlPlane`

Controls runtime behavior, policy enforcement, and exposure via Model Context Protocol (MCP).

```yaml
controlPlane:
  policies:
    disableDangerousTools: true
    requireApprovalFor:
      - "create_document"
      - "update_document"
      - "delete_document"
  mcp:
    profileServer:
      enabled: true
      exportIR: "./dist/knowledge-ir.json"
    automationServer:
      enabled: false
  evalGates:
    - name: "no-broken-links"
      strict: true
    - name: "policy-compliance"
      strict: true
```

- **`policies`**: Agent governance controls. `disableDangerousTools` and `requireApprovalFor` specify which tools need human-in-the-loop review.
- **`mcp`**: Defines which MCP servers should be enabled and which IR file they should load. The `automationServer` is disabled by default for safety.
- **`evalGates`**: Continuous evaluation gates that must pass before the control plane considers the desired state fully reconciled.

## Commands

- `akcp config validate`: Validates the `akcp.yaml` schema against structural errors.
- `akcp plan`: Outputs a deterministic execution plan detailing what will be compiled and what policies will be enforced.
- `akcp reconcile --dry-run`: Compares the desired state against the current file system state.
