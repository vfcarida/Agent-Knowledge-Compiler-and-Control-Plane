# AKCP Examples

This directory contains the flagship examples demonstrating the Agent Knowledge Compiler and Control Plane (AKCP) in action.

## Domain Examples (`examples/domains/`)

AKCP proves its domain-agnostic architecture through three flagship domains. You can use these to test the compiler, inspect generated Agent Knowledge IR (AK-IR), or serve local MCP resources.

| Domain | Directory | Maturity Status | What it demonstrates |
|--------|-----------|-----------------|----------------------|
| **Career** | `domains/career` | **Stable** | A low-friction starter domain for personal knowledge compilation. |
| **IT Operations** | `domains/it-operations` | **Beta** | The enterprise flagship. Demonstrates runbooks, incidents, system architectures, approvals, and immutable audit trails. |
| **Customer Support** | `domains/customer-support` | **Experimental** | Demonstrates policy-aware, privacy-preserving support knowledge compilation (tickets, macros, policies, PII redaction). |

## How to use an example

You can validate and compile any domain using the AKCP CLI.

```bash
# 1. Validate the knowledge bundle
pnpm akcp validate --bundle examples/domains/career --profile career

# 2. Compile the bundle into Agent Knowledge IR (AK-IR)
pnpm akcp compile --config examples/domains/career/akcp.yaml

# 3. Serve the bundle as MCP resources
pnpm akcp serve mcp --profile career
```

After compilation, inspect the `.akcp/cache/build-state.json` or `dist/` outputs (if configured in `akcp.yaml`) to see the generated semantic artifacts.
