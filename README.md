# Agent Knowledge Compiler and Control Plane

AKCP is an open-source compiler and control plane for turning organizational knowledge into versioned, governed, cost-efficient, agent-consumable artifacts, and for controlling how agents discover, retrieve and act on that knowledge through MCP-compatible capabilities.

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License Badge" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D%2020.0-emerald?style=for-the-badge" alt="Node.js Badge" />
  <img src="https://img.shields.io/badge/Spec-OKF%20v0.1-6366f1?style=for-the-badge" alt="OKF Spec Badge" />
  <img src="https://img.shields.io/badge/Protocol-MCP%20v1.0-06b6d4?style=for-the-badge" alt="MCP Protocol Badge" />
</p>

## 1. Category Thesis

> **AKCP compiles organizational knowledge into versioned, governed, cost-efficient and agent-consumable artifacts, and controls how agents discover, retrieve and act on that knowledge through MCP-compatible capabilities.**

AI agents today suffer from structural hallucination: they lack deterministic grounding. 
**AKCP** establishes a new product category by explicitly separating the lifecycle of agent knowledge into two operational planes:

1. **Build Plane (Compiler):** Ingests raw organizational context, normalizes it, and compiles it into semantically dense, strictly-typed context packs.
2. **Runtime Plane (Control Plane):** Governs how agents discover tools, budgets context retrieval, authorizes side-effects via Human-In-The-Loop (HITL), and provides full auditability.

Read the full narrative in the [Category Thesis](docs/product/category-thesis.md) and [Product Positioning](docs/product/positioning.md).

## 2. What this is (and what it is not)

**What this is:**
- A robust semantic compiler transforming Markdown into type-safe bundles.
- A runtime boundary (Control Plane) enforcing OWASP security controls over agentic execution.
- A unified dashboard for operators to track contextual spend, capability risks, and pending approvals.

**What this is not:**
- Not just a vector database or probabilistic RAG pipeline.
- Not a generic framework for building AI agents.
- Not an LLM prompt manager.

## 3. The Enterprise Imperative (Why Alternatives Fall Short)

Enterprises cannot afford unpredictable agentic behavior. Standard tools solve parts of the problem, but fail to provide a cohesive supply chain:
- **Why not just OKF?** The Open Knowledge Format provides excellent static primitives, but it lacks a runtime mechanism to enforce who can read what, or how an agent triggers a side-effect.
- **Why not just MCP?** The Model Context Protocol is a powerful RPC standard, but raw MCP exposes a massive attack surface. It lacks built-in semantic compiling, budgetary controls, and hitl approval boundaries.
- **Why not just OpenWiki?** OpenWiki is an excellent upstream authoring tool for keeping docs fresh via CI. However, AKCP takes those fresh docs, compiles them into rigorous Context Packs, and exposes them through a governed runtime. OpenWiki *authors*; AKCP *compiles and controls*.

## 4. Reference Domains (Career, IT Ops, Software)
To prove the model-independent nature of the compiler, this repository ships with `examples/domains/`. 
- **Career Knowledge Demo** is used as a vertical demo (resumes, skills, applications), demonstrating how human knowledge translates to agent context.
- **IT Operations** and **Software Projects** are included to prove cross-industry extensibility.

## 5. Quickstart

### Installation
You can install the CLI globally or use it via `npx` from within the repository:
```bash
git clone https://github.com/vfcarida/Agent-Knowledge-Compiler-Control-Plane.git akcp
cd akcp
npx pnpm install --frozen-lockfile
npx pnpm build
```

### The `akcp` CLI

The CLI provides a seamless developer experience for maintaining context:

```bash
# Initialize a new context pack in your current project
npx akcp init ./my-project --profile software

# Validate an existing bundle without an LLM
npx akcp validate sample-data/.okf

# Check your environment readiness
npx akcp doctor
```

Read the full [CLI Specification](docs/specs/cli.md) for advanced commands like `scan`, `build`, and `serve:mcp`.

*(Note: The legacy command `akcp` is maintained as a deprecated alias for backwards compatibility.)*

## 6. Enterprise Adoption Playbooks

AKCP provides practical, step-by-step playbooks to help organizations transition from generic wikis to governed, akcp knowledge:

- 🚀 **[Pilot in 2 Weeks](docs/enterprise/playbooks/pilot-in-2-weeks.md):** Launch a focused, high-value pilot quickly.
- 📚 **[Codebase Docs to Agent Context](docs/enterprise/playbooks/codebase-documentation-to-agent-context.md):** Transform stagnant wikis into dynamic OKF bundles.
- 🛠️ **[Runbooks to Agent Playbooks](docs/enterprise/playbooks/runbooks-to-agent-playbooks.md):** Evolve human-centric runbooks into testable agent scenarios.
- 🔌 **[API Catalog to MCP Resources](docs/enterprise/playbooks/api-catalog-to-mcp-resources.md):** Expose existing enterprise APIs securely via MCP.
- 🛡️ **[Enterprise Governance Rollout](docs/enterprise/playbooks/enterprise-governance-rollout.md):** Scale adoption using Policy Cards and the Zero-Trust Gateway.
- 🤝 **[Alignment Workshop Template](docs/enterprise/workshop-template.md):** Structure a kick-off meeting with Platform, Security, and SMEs.

## 7. Enterprise Maturity Status

| Component | Status | Evidence |
|---|---|---|
| **Core Validation CLI** | Stable | Schema tests + Idempotent Migrations |
| **MCP Exposure** | Stable | `ToolSuccess<T>` strict JSON contracts |
| **Governance (HITL)** | Beta | Cryptographic SQLite Approval Store |
| **Security & Evals** | Beta | CI pipeline with adversarial PI scenarios |
| **Observability** | Beta | OpenTelemetry instrumented spans |

## 8. Roadmap & Governance
AKCP evolves as a formal specification. To ensure a stable ecosystem for context packs, we maintain strict versioning and compatibility guarantees.

- **[AKCP Specification (spec/)](spec/README.md):** Implementation-independent specification for AK-IR, build pipeline, Policy Cards, and conformance levels.
- **[Whitepaper](docs/research/whitepaper.md):** The full problem statement, prior art, and architecture thesis.
- **[Specification Governance ADR](docs/adrs/ADR-spec-governance.md):** How the spec is versioned and governed separately from the implementation.
- **[RFC Process](docs/rfcs/README.md):** How we propose, discuss, and accept new Profiles, MCP Tools, and spec changes.

See `CONTRIBUTING.md` for code-level guidelines. We strictly adhere to the NIST AI RMF and OWASP LLM Top 10.

- **Current focus:** Hardening the React Dashboard for real-time Human-In-The-Loop approvals.
- **Next up:** Remote MCP exposure guidelines and Authentication flows.

---
*Licensed under MIT.*
