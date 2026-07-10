# IT Operations Domain Example

This example demonstrates an AKCP bundle for an IT operations team managing runbooks, incident procedures, and deployment guides.

## What's Included

| File | OKF Type | Description |
|------|----------|-------------|
| `sample-data/` | Various | Runbooks, incident procedures, deployment guides in OKF format |

## Running This Example

```bash
# Validate the bundle schema
npx akcp validate ./examples/domains/it-operations/sample-data

# Compile to all targets (including eval-dataset for CI testing)
akcp compile --bundle ./examples/domains/it-operations

# Check the readiness score
akcp scorecard run --bundle ./examples/domains/it-operations
```

## Expected Results

- **Scorecard:** >80/100
- **Compilation targets:** `ir.json`, `openwiki-docs/`, and `eval-dataset.jsonl` in `dist/`

## Governance

This bundle applies a strict policy for IT operations. Note that `execute_command` and `restart_service` tools require explicit human approval (HITL) — never autonomous execution.

See `akcp.yaml` for the full configuration.

## Use Cases

- An on-call agent that retrieves the relevant runbook section during an incident.
- A deployment agent that references the deployment procedure before executing steps.
- A compliance agent that verifies that all operational procedures are current and approved.
