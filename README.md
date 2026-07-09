# 🌌 ContextOps for Agent-Ready Knowledge

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License Badge" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D%2020.0-emerald?style=for-the-badge" alt="Node.js Badge" />
  <img src="https://img.shields.io/badge/Spec-OKF%20v0.1-6366f1?style=for-the-badge" alt="OKF Spec Badge" />
  <img src="https://img.shields.io/badge/Protocol-MCP%20v1.0-06b6d4?style=for-the-badge" alt="MCP Protocol Badge" />
  <img src="https://img.shields.io/badge/Monorepo-pnpm-a855f7?style=for-the-badge" alt="Pnpm Monorepo Badge" />
  <img src="https://img.shields.io/badge/Tests-60%20Passed-22c55e?style=for-the-badge" alt="Tests Badge" />
</p>

<p align="center">
  <strong>A standard toolkit for building governed, agent-ready context supply chains.</strong>
</p>

---

## 1. What is ContextOps?
**ContextOps** is the discipline of transforming fragmented organizational knowledge into versioned, governed, and interoperable context packs for AI agents. 

Rather than relying on probabilistic RAG retrieval or massive unchecked prompt inputs, ContextOps provides deterministic, strictly-typed data payloads. We leverage Google's lightweight **Open Knowledge Format (OKF)** specification, exposed securely via Anthropic's **Model Context Protocol (MCP)**.

Read the [ContextOps Strategic Positioning](docs/strategy/positioning.md) and the [Manifesto: 10 Principles of Agent-Ready Knowledge](docs/manifesto/agent-ready-knowledge.md).

## 2. The Wedge (Why You Need This)
Agents today fail not because they lack reasoning, but because they lack **clean, deterministic context**. Developers and platform teams struggle to keep context synchronized across different agent frameworks (Cline, Cursor, Custom MCP clients).

This project provides a **zero-setup CLI** (`validate`, `migrate`) and a pre-hardened **MCP Server** to instantly mount a governed, typed, Markdown-based directory as universal context for any agent. If you can write Markdown, you can supply context to an agent securely.

## 3. Core Components
- **OKF Core Validation & Migration CLI:** A suite of tools to enforce strict Markdown and YAML frontmatter typings for your organizational knowledge.
- **MCP Profile Server:** A secure read-only API gateway mapping your OKF directories directly into MCP Resources and Tools.
- **MCP Automation Server (HITL):** A safety boundary executing external agentic actions strictly governed by a local SQLite Approval Store. Prevents unauthorized AI mutations.
- **Continuous Evals:** A dedicated evaluation harness (`@ocf/evals`) checking for Assurance against adversarial prompt injections and Trust Propagation risks.

## 4. Example Vertical: Career Context
To demonstrate ContextOps in reality, this repository ships with the **Open Career Format (OCF)** Profile—a specialized implementation demonstrating how to map resumes, skills, and application data into OKF.
- **It is an example vertical, not the limit.** You can adapt the exact same OKF schema principles to IT Architecture records, HR Policies, or Legal guidelines.

## 5. Quickstart

### Installation
```bash
git clone https://github.com/vfcarida/Agent-ready-Knowledge-Reference-Architecture.git
cd Agent-ready-Knowledge-Reference-Architecture
npx pnpm install --frozen-lockfile
npx pnpm build
```

### Validate a Context Bundle
```bash
npx pnpm validate:bundle --bundle sample-data/.okf --format json
```

### Claude Desktop Integration
Add the following to your `claude_desktop_config.json` to expose your context immediately to Claude:
```json
{
  "mcpServers": {
    "contextops-profile": {
      "command": "node",
      "args": ["C:\\absolute\\path\\to\\repo\\packages\\mcp-profile-server\\dist\\index.js"]
    },
    "contextops-automation": {
      "command": "node",
      "args": ["C:\\absolute\\path\\to\\repo\\packages\\mcp-automation-server\\dist\\index.js"],
      "env": { "AUTOMATION_RUNTIME_MODE": "sandbox" }
    }
  }
}
```

## 6. Enterprise Maturity Status

| Component | Status | Evidence |
|---|---|---|
| **Core Validation CLI** | Stable | Schema tests + Idempotent Migrations |
| **MCP Exposure** | Stable | `ToolSuccess<T>` strict JSON contracts |
| **Governance (HITL)** | Beta | Cryptographic SQLite Approval Store |
| **Security & Evals** | Beta | CI pipeline with adversarial PI scenarios |
| **Observability** | Beta | OpenTelemetry instrumented spans |

## 7. Roadmap & Governance
See `CONTRIBUTING.md` for our Spec-Driven Development (SDD) standards. We strictly adhere to the NIST AI RMF and OWASP LLM Top 10.

- **Current focus:** Hardening the React Dashboard for real-time Human-In-The-Loop approvals.
- **Next up:** Remote MCP exposure guidelines and Authentication flows.

---
*Licensed under MIT.*
