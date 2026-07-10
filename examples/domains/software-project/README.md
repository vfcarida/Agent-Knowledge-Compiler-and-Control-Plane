# Software Engineering Domain Example

This example demonstrates an AKCP bundle for a software engineering team's knowledge base.

## What's Included

| File | OKF Type | Description |
|------|----------|-------------|
| `adr-001.okf.md` | `ArchitectureDecisionRecord` | Example ADR using OKF |
| `onboarding.md` | `document` | Developer onboarding guide |
| `api-contracts.md` | `document` | Public API contract documentation |

## Running This Example

```bash
# Validate the bundle schema
npx akcp validate ./examples/domains/software-project/sample-data

# Compile the bundle to all targets
akcp compile --bundle ./examples/domains/software-project

# Check the readiness score
akcp scorecard run --bundle ./examples/domains/software-project
```

## Expected Results

- **Scorecard:** >80/100
- **Compilation:** `ir.json` and `openwiki-docs/` produced in `dist/`

## Governance

See `.policy.yaml` for the default policy applied to this bundle.  
Default autonomy: `read-only` (agents may read but not modify software assets).
