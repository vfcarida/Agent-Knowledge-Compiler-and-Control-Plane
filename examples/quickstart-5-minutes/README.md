# ContextOps: 5-Minute Quickstart (No LLM Required)

This quickstart demonstrates how to organize, validate, and govern Agent-Ready Knowledge using the ContextOps CLI and OKF format without needing any API keys.

## Prerequisites
- Node.js (v18+)
- `pnpm` or `npm`

## 1. Install the CLI

\`\`\`bash
npm install -g @ocf/cli
\`\`\`
*(For local development, you can use `npx agent-ready` at the root of the repo)*

## 2. Initialize a Context Pack

Let's create a strictly typed Context Pack using the `software-project` domain template.

\`\`\`bash
mkdir my-agent-knowledge
cd my-agent-knowledge
npx agent-ready init . --profile software-project
\`\`\`

This will create a `.agent-context/` directory with an `index.md` and some sample OKF documents.

## 3. Validate the Bundle

Instead of hoping the LLM figures out your messy README, let's strictly validate our new Context Pack to ensure it adheres to the schema.

\`\`\`bash
npx agent-ready validate . --profile software-project
\`\`\`

You should see:
\`\`\`
[INFO] Validating bundle at: /path/to/my-agent-knowledge
[OK] Validation passed: 3 files checked. 0 errors.
\`\`\`

## 4. Instruct Your Agent

Now, instead of writing a massive prompt, run the sync command to instruct your agent (Copilot, Cursor, Cline) to use this structured knowledge.

\`\`\`bash
npx agent-ready agents sync
\`\`\`

Check your `AGENTS.md` file! The CLI has injected a strictly governed instruction block pointing the agent to your `.agent-context/` folder and defining safety policies.

## 5. Next Steps
You have just structured your first Agent-Ready Knowledge base.
- To see how agents interact with this via tools, check out our [MCP Architecture Docs](../../docs/mcp/README.md).
- Want to apply this to HR, Compliance, or IT? Read about [Domain Adapters](../../docs/domain-adapters/README.md).
