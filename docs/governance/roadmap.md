# AKCP Community Roadmap

> This roadmap is public and maintained by the community. It is organized into three tiers: **Core** (stable, shipping), **Experimental** (in active development), and **Research** (future exploration, not yet scoped).

---

## 🟢 Core (Stable)

These features are implemented, tested, and considered stable as of the current release.

- **OKF v0.1 Parsing** — Full YAML frontmatter + Markdown body parsing with schema validation.
- **AK-IR Compilation** — Deterministic, type-safe Intermediate Representation with SHA-256 provenance.
- **Context Economics** — Token budget planning and cost estimation for agent retrievals.
- **Policy Cards** — Machine-readable YAML governance with `read-only` / `read-write` / `autonomous` levels.
- **Zero-Trust MCP Gateway** — Policy-enforcing gateway for all MCP tool calls with audit logging.
- **HITL Approval System** — Human-in-the-Loop approval gates for high-risk actions.
- **Knowledge Lifecycle Management** — Freshness tracking, deprecation, and successor chaining.
- **Conformance Suite** — Automated verification of AKCP conformance claims.
- **Agent Knowledge Readiness Scorecard** — Quantified bundle quality scoring (0-100).
- **Plugin Architecture** — Declarative `akcp-plugin.json` manifest for build-time connectors.
- **Semantic & Git Revision Diff (`akcp diff`)** — Human- and machine-readable diffing of AK-IR snapshots and Git revisions (`--from-git`, `--to-git`) for change review and CI/CD gating.
- **Policy Linter & Enterprise Compliance Bundles (`akcp policy lint`)** — Static detection of shadowed, contradictory, and redundant policy rules, paired with turnkey GDPR, HIPAA, and SOC 2 policy templates (`docs/specs/examples/compliance/`).
- **Grounding & Prompt-Injection Evaluation (`akcp evals`)** — Reproducible evaluation harnesses for retrieval grounding (Precision@k, Recall@k, Hit Rate) and OWASP LLM01 prompt-injection defense.
- **Single-Command Quickstart (`akcp quickstart`)** — Zero-setup bootstrapping, compiling, and auto-launching Control Plane dashboard.
- **Control Plane CLI & Dashboard BFF (`akcp control-plane`, `akcp serve dashboard`)** — Precompiled Node.js Express BFF, native React 19 SPA bundling, and runtime inspection commands (`inspect`, `policies`, `approvals`, `audit`).
- **Customer Support Enterprise Domain (Stable)** — Enterprise domain with ticket resolution runbooks, macro suggestions, PII redaction, customer history retrieval, governed MCP tools, and HITL approval gates with golden compiler test verification.

---

## 🟡 Experimental (In Development)

These features are being actively developed and may change.

- **OpenWiki Bidirectional Sync Connector** — Pull fresh docs from OpenWiki/LangChain into OKF bundles.
- **Live Cloud Infrastructure Adapters** — Native Kubernetes and CRM webhook execution adapters for the MCP Automation Server.

---

## 🔵 Research (Exploring)

These are speculative research directions. No implementation is planned yet.

- **Remote MCP Authentication** — Standardized OAuth 2.0 flows for externally-hosted MCP servers.
- **Federated Knowledge Registries** — Cross-organization knowledge sharing with provenance verification.
- **LLM-Assisted OKF Authoring** — Using agents to suggest OKF frontmatter for new documents.

---

## How to Influence the Roadmap

1. **Vote on existing issues** using 👍 reactions.
2. **Open a new issue** using the appropriate template (RFC, feature request, connector).
3. **Join the discussion** on open RFCs in [the RFC Process](rfc-process.md).

The roadmap is reviewed quarterly by the maintainer team.
