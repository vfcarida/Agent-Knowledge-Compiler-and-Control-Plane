<!-- akcp:start -->

> **⚠️ MANAGED CONTEXT BLOCK ⚠️**
> The contents of this block are automatically synchronized by `akcp agents sync`.
> Do not edit this block manually. Place custom instructions outside these markers.

## 1. Project Purpose

AKCP Orchestrator - Managing AI Agent Knowledge via Agent Knowledge Compiler and Control Plane (OKF) and Context Packs.

## 2. Architecture Boundaries

Use TypeScript, ESM, Node.js. Avoid external dependencies unless justified.

## 3. Context Sources

Always consult the `.agent-context/` directory or use MCP Profile Server tools (`list_documents`, `read_document`) before answering questions.

## 4. Commands to Run

Run `npx akcp validate` to check OKF bundles. Run `pnpm test` for unit tests.

## 5. Forbidden Actions

Do NOT bypass MCP capabilities. Do NOT commit destructive changes without user approval.

## 6. Docs to Consult

Reference OKF Specification, MCP Architecture, NIST AI RMF, and OWASP LLM Top 10.

## 7. Testing Requirements

Write tests proportionate to the risk level. Run Vitest before declaring success.

## 8. Security Requirements

Assume MCP tool inputs are hostile. Follow Least Privilege.

## 9. Commit / PR Conventions

Use Conventional Commits (e.g. `feat: `, `fix: `). Never credit AI in commit messages.

<!-- akcp:end -->

# Project Rules

- **Git Commits**: All commit messages must use simple, standard developer-written names (e.g., standard conventional commits like `feat: add types`, `fix: update parser`). Never credit or reference AI, agent, LLM, prompt, or code assistants in commit messages.
- **Language**: All code and documentation must be written in English.
