# AKCP Community Roadmap

This roadmap outlines current deliverables, active developments, and future research directions for the **Agent Knowledge Compiler and Control Plane (AKCP)**.

The full, living roadmap specification is maintained at [docs/governance/roadmap.md](docs/governance/roadmap.md).

---

## 🟢 Core (Stable & Beta)

Production-ready and CI-validated capabilities shipping in current releases:

- **OKF v0.1 Parsing & Normalization**: Full YAML frontmatter and Markdown body parsing with deterministic schema validation.
- **AK-IR Intermediate Representation & 11 Compile Targets**: Type-safe IR compilation with SHA-256 provenance hashing and deterministic emission across `context-pack`, `openwiki`, `agent-instructions`, `mcp-resources`, `mcp-tools`, `mcp-prompts`, `policy-bundle`, `eval-dataset`, `dashboard-metadata`, `graph-json`, and `okf-bundle`.
- **Zero-Trust MCP Gateway**: Policy-enforced tool execution interceptor with rate limiting, PII redaction, and audit logging.
- **Human-In-The-Loop (HITL) Store**: Approval gating for high-risk agent operations with TTL-bound, single-use SHA-256 tokens.
- **Policy Cards Engine & Policy Linter (`akcp policy lint`)**: Declarative YAML governance supporting condition evaluations, environment scoping, conflict resolution, and static detection of shadowed, contradictory, and redundant rules.
- **Enterprise Compliance Bundles**: Turnkey, CI-linted policy templates mapped to GDPR, HIPAA, and SOC 2 requirements (`docs/specs/examples/compliance/`).
- **Semantic & Git Revision Diff Engine (`akcp diff`)**: AST-level diffing between knowledge bundles or Git revisions (`--from-git`, `--to-git`) with breaking-change severity classification.
- **Grounding & Adversarial Evaluation (`akcp evals`)**: Automated evaluation suites for prompt-injection defense (`--scenario prompt-injection`) and retrieval grounding Precision@k / Recall@k (`--scenario retrieval-grounding`).
- **Unified CLI Suite & VSCode Extension**: Modular CLI commands plus VSCode extension with OKF frontmatter diagnostics and completions.
- **Production Reference Domains**: Golden compiler snapshots and verification for `career`, `it-operations`, and `customer-support`.

---

## 🟡 Experimental (In Active Development)

Features undergoing active engineering and API stabilization:

- **OpenWiki Bidirectional Sync Connector**: Continuous incremental synchronization of documents from external wikis into governed OKF bundles.
- **Live Cloud Infrastructure Adapters**: Native Kubernetes and CRM webhook execution adapters for the MCP Automation Server.

---

## 🔵 Research (Exploratory)

Architectural investigations scoped for future major initiatives:

- **Remote MCP Authentication**: Standardized OAuth 2.0 / OIDC identity flows for distributed MCP profile servers.
- **Federated Knowledge Registries**: Cross-organizational knowledge mesh with cryptographic provenance verification.
- **Autonomous OKF Synthesis**: Governed agent tooling for drafting and maintaining OKF frontmatter from unstructured sources.

---

## Community Participation & RFCs

AKCP follows an open Request for Comments (RFC) model for architectural evolution. To participate or propose changes:

1. Review existing proposals in [docs/rfcs/](docs/rfcs/).
2. Consult the [RFC Governance Process](docs/governance/rfc-process.md).
3. Submit a proposal using the [RFC Template](docs/rfcs/template.md).
