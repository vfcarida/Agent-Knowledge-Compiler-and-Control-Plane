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

---

## 🟡 Experimental (In Development)

These features are being actively developed and may change.

- **OpenWiki Sync Connector** — Pull fresh docs from OpenWiki/LangChain into OKF bundles.
- **Dashboard UI / HITL Panel** — Real-time React UI for approving/denying pending agent actions.
- **Eval Pipeline** — Automated evaluation of agent grounding against OKF ground truth.
- **Enterprise Governance Bundles** — Pre-built policy packs for GDPR, HIPAA, SOC2.
- **Customer Support Flagship** — Third enterprise domain with AI-assisted ticket resolution, macro suggestions, PII redaction, customer history retrieval, and HITL approval for high-risk actions. Design doc exists; initial domain structure and conformance tests are in place. Status: `Experimental`.

---

## 🔵 Research (Exploring)

These are speculative research directions. No implementation is planned yet.

- **Remote MCP Authentication** — Standardized OAuth 2.0 flows for externally-hosted MCP servers.
- **Federated Knowledge Registries** — Cross-organization knowledge sharing with provenance verification.
- **Semantic Diff** — Human-readable diff of two AK-IR snapshots for change review.
- **LLM-Assisted OKF Authoring** — Using agents to suggest OKF frontmatter for new documents.

---

## How to Influence the Roadmap

1. **Vote on existing issues** using 👍 reactions.
2. **Open a new issue** using the appropriate template (RFC, feature request, connector).
3. **Join the discussion** on open RFCs in [the RFC Process](rfc-process.md).

The roadmap is reviewed quarterly by the maintainer team.
