# IT Operations Flagship Demo

## What this demonstrates

This is the enterprise flagship for AKCP (Agent Knowledge Compiler and Control Plane). It demonstrates how a platform engineering team can use AKCP to securely manage runbooks, incident response procedures, and deployment guides. Crucially, it showcases the **safety model**: using machine-readable Policy Cards to enforce Human-In-The-Loop (HITL) approvals for risky agent actions (like restarting services or deploying code).

## Scenario

An on-call AI agent is paged for a High CPU alert on the `payment-service`. The agent:

1. Consults the service catalog to understand the architecture.
2. Locates the correct high-CPU runbook.
3. Proposes an action plan.
4. Attempts to execute a risky command (`restart_service`).
5. Is blocked by AKCP's policy engine, which requests human approval.
6. Only proceeds after explicit authorization, logging all actions to an audit trail.

## Architecture

AKCP acts as the compiler and control plane:

- **Sources**: OpenWiki documents and OKF frontmatter in this directory.
- **Compiler**: AKCP compiles this into an Agent Knowledge Intermediate Representation (AK-IR).
- **Runtime**: An MCP (Model Context Protocol) Profile Server exposes this safely to the agent.
- **Safety Engine**: Evaluates tools against Policy Cards before execution.

## Knowledge Sources

- `services/`: Service catalog entries (Auth, Payment).
- `runbooks/`: Procedures for common alerts (High CPU, High Memory).
- `incidents/`: Playbooks for P1/P2 incidents.
- `policies/`: SLO definitions and governance configurations.

## Compile Pipeline

1. Run `akcp compile --config examples/domains/it-operations/akcp.yaml`.
2. Inspect the generated `agent-knowledge-ir.json` and `akcp-manifest.json` in `dist/`.

## MCP Resources, Prompts and Tools

- **Resources**: `akcp://it-ops/services/payment-service`, `akcp://it-ops/runbooks/high-cpu`
- **Prompts**: `triage_incident`, `prepare_change_plan`
- **Tools (Sandboxed)**: `search_runbooks`, `simulate_command`
- **Tools (Restricted/HITL)**: `restart_service`, `deploy_service`, `execute_command`

## Policy and Approval Model

We use `Policy Cards` (YAML) to configure risk constraints. For example, `restart_service` is flagged as `critical` risk and explicitly requires `requiresApproval: true`.

## Running the Demo

Check the [WALKTHROUGH.md](./WALKTHROUGH.md) for step-by-step CLI commands.

## Expected Outputs

- Compiled Knowledge Graph and IR json files.
- Evaluation scorecard showing >90% policy compliance.

## Metrics and Scorecard

See [scorecard.md](./scorecard.md) for the readiness metrics, context budget usage, and safety coverage.

## Safety Model

AKCP enforces **Zero-Trust for Agents**. All commands default to dry-run or block unless explicitly allowed by a Policy Card, and high-impact side effects trigger out-of-band human approvals with TTLs.

## Limitations

- This demo runs entirely locally and uses mock tools for `restart_service` to avoid executing arbitrary shell commands on your machine.
