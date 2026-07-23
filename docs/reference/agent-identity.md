# Agent Identity

In the Agent Knowledge Compiler and Control Plane, **Agent Identity** is a critical concept that binds an autonomous client to a specific security posture.

## Structure

An `AgentIdentity` consists of:

- **`agentId`**: A unique string identifying the agent (e.g., `resume-tailor-bot-v1`).
- **`roles`**: An array of logical roles assigned to the agent (e.g., `['researcher', 'writer']`).
- **`policyCardName`**: The name of the `PolicyCard` (e.g., `strict-enterprise`) that dictates the runtime governance constraints for this specific agent.

## Configuration

Agent identities and their bindings are configured in `akcp.yaml` under `controlPlane.identities`.

```yaml
controlPlane:
  identities:
    - agentId: "read-only-crawler"
      policyCardName: "sandbox-only"
    - agentId: "career-automation-agent"
      policyCardName: "strict-enterprise"
```

## How it Works

1. **Resolution**: When an agent attempts to execute an MCP tool, the Zero-Trust Gateway looks up the `agentId` to resolve the bound `PolicyCard`.
2. **Fallback**: If an agent connects without a registered `agentId`, or the `agentId` is omitted, the Gateway falls back to the `defaultPolicy`. If no default policy is strictly defined, the Gateway denies execution with an `UNAUTHORIZED_AGENT` error.
3. **Execution**: The tool executes within the bounds of the agent's identity, meaning the logs, side effects, and budget tracking are all correctly attributed.
