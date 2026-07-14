# AKCP Career Domain Walkthrough

Welcome to the **Career Starter Domain**. This walkthrough demonstrates how the Agent Knowledge Compiler and Control Plane (AKCP) ingests, validates, compiles, and evaluates knowledge using a simple, easily understood dataset: personal career history.

> **Why Career?** AKCP is built for complex enterprise domains (e.g., IT Operations, Customer Support), but those require significant organizational context to understand. The Career domain serves as a universal, low-friction entry point to learn the system's mechanics.

## Prerequisites

Ensure you have installed the AKCP CLI and built the monorepo:
\\\ash
pnpm install
pnpm build
\\\

All commands below should be run from the repository root.

## 1. Inspect the Source Knowledge

The source data is located in examples/domains/career/knowledge/. It uses the Open Knowledge Format (OKF) convention: frontmatter metadata combined with Markdown content.

Take a look at the files:
- **profile.md**: Basic profile info.
- **experience-acmecorp.md**: Job experience details.
- **preferences.md**: Work constraints and salary targets.

## 2. Validate the Bundle

Before compiling, AKCP ensures the bundle configuration (kcp.yaml) and knowledge sources are valid and compliant.

\\\ash
pnpm akcp validate examples/domains/career
\\\

**Expected Output:** The CLI will confirm the schema is valid and the dependencies are sound.

## 3. Compile the Artifacts

Compile the raw knowledge into compiled artifacts (MCP resources, context packs, OpenWiki docs).

\\\ash
pnpm akcp compile examples/domains/career
\\\

This command outputs artifacts into examples/domains/career/dist/.

## 4. Inspect the Manifest

You can view the resulting compilation manifest to see exactly what targets were generated and their cryptographic hashes.

\\\ash
pnpm akcp inspect examples/domains/career
\\\

**What to look for:**
- ir-json (Context Pack): For embedding directly into agent prompts.
- openwiki: For human and LLM-readable RAG integration.
- mcp-resources: The tool descriptors and policy definitions for the Model Context Protocol.

## 5. Run Evaluations

AKCP treats agent behavior as testable software. We evaluate whether the agent can correctly answer questions based on the compiled knowledge.

\\\ash
pnpm akcp evals run examples/domains/career
\\\

The evaluation runner will test prompts from examples/domains/career/evals/dataset.json against a local mock LLM or configured target, ensuring the agent retrieves the right context and honors the career policy constraints.

## Next Steps

Now that you understand the mechanics on a simple dataset, explore the **IT Operations** or **Customer Support** domains to see AKCP applied to enterprise-grade incident response and policy-governed workflows.