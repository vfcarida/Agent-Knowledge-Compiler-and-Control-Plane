# AKCP Domain Adapters

AKCP was designed to be domain-agnostic. While the reference implementation focuses on **Career** (the Agent Knowledge Compiler and Control Plane (AKCP)), the true power of Agent-Ready Knowledge lies in its ability to adapt to any vertical.

By utilizing **Domain Adapters**, enterprises can scaffold Agent-Ready environments instantly. A Domain Adapter is a template that provides:
1. **Profile Schema**: Strict TypeScript/Zod definitions for the domain's entities.
2. **Sample OKF Data**: Real-world Markdown/YAML files that parse perfectly.
3. **MCP Capabilities Manifest**: The specific tools that agents need to interact with the domain.
4. **Governance Policy**: A risk-adjusted autonomy profile for the domain.

## Available Adapters

- `software-project`: (Recommended) Connects AI Coding Agents with Architecture Decision Records (ADRs) and Requirements.
- `career`: The baseline Agent Knowledge Compiler and Control Plane (AKCP).
- `it-operations`: Runbooks, incident reports, and system topology.
- `compliance`: Audit trails, policies, and evidence logs.
- `customer-support`: FAQs, macros, and ticket histories.

## Usage

You can initialize an adapter into your project via the CLI:
```bash
npx akcp init --profile software-project ./my-agent-knowledge
```
