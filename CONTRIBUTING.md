# Contributing to ContextOps

We welcome contributions that improve the safety, efficiency, and clarity of AI Agent context! 
To keep the repository stable and easy to review, please follow these guidelines.

## 1. Small, Iterative PRs Only
- Large, monolithic PRs that refactor multiple domains will be rejected. 
- Break your changes down into small, trackable additions. 
- Focus on one thing per PR (e.g., adding a single capability, or a single eval scenario).

## 2. Structured Outputs > Free Text
ContextOps relies on structure. If you are adding new context, do not just dump markdown paragraphs. 
You must define or use a Zod schema for the OKF Frontmatter.

## 3. Mandatory Testing
- **Evals are our compass.** If you are changing how the CLI parses OKF or how MCP tools behave, you *must* add or update an eval scenario in `packages/evals/`.
- Run `pnpm test` and `pnpm build` locally before submitting.

## 4. Run the Dev Environment
\`\`\`bash
# Install dependencies
pnpm install

# Run full suite (build, format, lint, test)
pnpm run build
pnpm test
\`\`\`

## 5. "Good First Issues"
Check our issue tracker for `good first issue` labels. We highly recommend starting by:
- Creating a new `Domain Adapter`.
- Submitting a new `Eval Scenario`.
- Improving a tool description in the Capability Registry.
