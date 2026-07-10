# Playbook: Runbooks to Agent Playbooks

## Objective
Evolve static, human-centric operational runbooks (e.g., Incident Response, Deployment Procedures) into deterministic, testable Agent Playbooks.

## Prerequisites
- A collection of operational runbooks.
- An environment to safely run agent evaluation datasets.

## Stakeholders
- **Site Reliability Engineers (SREs) / DevOps:** Own the logic and validation.
- **Security / Compliance:** Ensure playbooks do not authorize risky autonomous actions.

## Executable Steps

1. **Convert to OKF Structure:**
   Translate step-by-step human instructions into a declarative OKF Markdown file (`type: playbook`). Break down complex decisions into discrete conditional blocks that an LLM can easily parse.
2. **Define Tools and Governance:**
   Create an adjacent `akcp.yaml` and `.policy.yaml` explicitly defining which tools the agent is permitted to use when executing this playbook.
   ```yaml
   policies:
     requireApprovalFor: ["execute_command", "modify_db"]
   ```
3. **Generate Eval Datasets:**
   Use the `eval-dataset` target to generate JSONL evaluation scenarios based on the playbook.
   ```bash
   akcp compile --target eval-dataset
   ```
4. **Test the Agent:**
   Run your agent against the generated `eval-dataset` in a sandbox to ensure it correctly follows the deterministic path outlined in the OKF bundle.

## Risks & Limitations
- **Anti-pattern:** Allowing an agent to autonomously execute destructive runbooks (e.g., DB failovers) on day one.
- **Risk:** Agents skipping steps. Use strict MCP tool definitions and require human-in-the-loop (HITL) approvals via Policy Cards.

## Metrics (Before/After)
- **Before:** Runbooks are manually executed, prone to human error, and rarely tested.
- **After:** Runbooks are versioned OKF artifacts, securely governed, and continuously evaluated.
- **Metric:** Mean Time to Resolution (MTTR) for incidents covered by akcp playbooks.

## Definition of Done
- Runbooks are converted to OKF `type: playbook` format.
- Corresponding `.policy.yaml` restricts destructive actions.
- `eval-dataset` target successfully compiles and is used in a CI pipeline.
