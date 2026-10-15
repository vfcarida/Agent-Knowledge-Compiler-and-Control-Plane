# AKCP Community Roadmap

This roadmap outlines current deliverables, active developments, and future research directions for the **Agent Knowledge Compiler and Control Plane (AKCP)**.

The full, living roadmap specification is maintained at [docs/governance/roadmap.md](docs/governance/roadmap.md).

---

## 🟢 Core (Stable & Beta)

Production-ready and CI-validated capabilities shipping in current releases:

- **OKF v0.1 Parsing & Normalization**: Full YAML frontmatter and Markdown body parsing with deterministic schema validation.
- **AK-IR Intermediate Representation**: Type-safe IR compilation with SHA-256 provenance hashing and AST normalization.
- **Zero-Trust MCP Gateway**: Policy-enforced tool execution interceptor with rate limiting, PII redaction, and audit logging.
- **Human-In-The-Loop (HITL) Store**: Approval gating for high-risk agent operations with TTL-bound tokens.
- **Policy Cards Engine**: Declarative YAML governance supporting condition evaluations, environment scoping, and conflict resolution.
- **Semantic Diff Engine (`akcp diff`)**: AST-level diffing between knowledge bundles with breaking change severity classification.
- **Unified CLI Suite**: Modular commands for `init`, `validate`, `compile`, `diff`, `quickstart`, and `control-plane` inspection.
- **Production Reference Domains**: Golden compiler snapshots and verification for `career`, `it-operations`, and `customer-support`.

---

## 🟡 Experimental (In Active Development)

Features undergoing active engineering and API stabilization:

- **OpenWiki Sync Connector**: Continuous synchronization of documents from external wikis into governed OKF bundles.
- **Grounding Evaluation & Drift Detection**: Automated evaluation suites tracking agent retrieval fidelity against compiled knowledge.
- **Enterprise Compliance Bundles**: Turnkey policy templates mapped to GDPR, HIPAA, and SOC2 requirements.

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
