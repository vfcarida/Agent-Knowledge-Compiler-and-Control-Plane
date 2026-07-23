# Multi-Domain Automation Safety

AKCP operates as a control plane for AI agents, allowing them to take real-world actions via the Model Context Protocol (MCP). Automation poses significant risks if weaponized, whether it's manipulating cloud infrastructure (IT Operations) or modifying user data (Customer Support).

AKCP mitigates these risks via architecture:

## 1. Sandbox by Default

The `AUTOMATION_RUNTIME_MODE` environment variable defaults to `sandbox`. In this mode, no real side-effects or network submissions occur. Data is mock-submitted to a local echo server or intercepted at the connector level. To execute real actions, the environment must explicitly define `explicit-authorized-live`.

## 2. Policy-Bound Execution

Automation is strictly governed by **Policy Cards** (`policy.yaml`). Tools are annotated with `riskLevel` boundaries:
- **Low Risk**: Allowed to run autonomously if `autonomyLevel` is `autonomous`.
- **Medium/High Risk**: Blocked unless `autonomyLevel` allows it, and strongly recommended to require explicit approval.
- **Critical Risk**: Will always fail unless explicitly authorized by a Human-In-The-Loop (HITL) approval flow, regardless of autonomy level.

## 3. Human-In-The-Loop (HITL) 

Destructive or highly sensitive actions are split into a two-phase commit:
1. **Prepare**: The agent calls a preparation tool (e.g., `prepare_infrastructure_deployment` or `stage_customer_refund`). The control plane stages the payload and returns an `ApprovalToken`.
2. **Execute**: The human reviews the staged payload. The agent calls the execution tool (e.g., `execute_deployment`) providing the token. The control plane hashes the payload to ensure it wasn't modified post-approval.

## 4. No Anti-Bot Circumvention

We strictly prohibit the inclusion of `puppeteer-extra-plugin-stealth` or any other CAPTCHA bypass mechanisms in our connectors. If an external system blocks an agent's request (e.g., during web automation or API scraping), it is considered a legitimate block, and the agent must fail gracefully.

## 5. Data Privacy and Telemetry

No tracking scripts or analytics are permitted within the orchestration context. All execution contexts are isolated, meaning sensitive variables injected into an execution sandbox cannot leak out through generic telemetry channels.
