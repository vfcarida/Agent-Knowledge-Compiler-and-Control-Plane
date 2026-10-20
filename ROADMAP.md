# AKCP Community Roadmap

This roadmap outlines current deliverables, active developments, and future research directions for the **Agent Knowledge Compiler and Control Plane (AKCP)**.

The full, living roadmap specification is maintained at [docs/governance/roadmap.md](docs/governance/roadmap.md).

---

## 🟢 Core (Stable & Beta)

Production-ready and CI-validated capabilities shipping in current releases:

- **OKF v0.1 Parsing & Normalization**: Full YAML frontmatter and Markdown body parsing with deterministic schema validation.
- **AK-IR Intermediate Representation & 12 Compile Targets**: Type-safe IR compilation with SHA-256 provenance hashing and deterministic emission across `context-pack`, `openwiki`, `agent-instructions`, `mcp-resources`, `mcp-tools`, `mcp-prompts`, `policy-bundle`, `eval-dataset`, `dashboard-metadata`, `graph-json`, `okf-bundle`, and `hybrid-index`.
- **Hybrid Retrieval Engine (`HybridRetriever` & `akcp context plan --strategy hybrid`)**: Combines Okapi BM25 lexical scoring, deterministic L2-normalized dense embeddings, and Personalized PageRank over the Semantic Knowledge Graph via Reciprocal Rank Fusion (RRF).
- **Cryptographic Provenance Signing (`akcp sign` & `akcp verify --public-key`)**: Ed25519 asymmetric signing and verification of in-toto ITE-6 provenance attestations (`compile --sign-key`, `akcp sign`, `akcp verify`).
- **Zero-Trust MCP Gateway & JWT/OIDC Identity Verification**: Policy-enforced tool execution interceptor with HS256/EdDSA/RS256 JWT bearer verification, OIDC scope/role mapping, Streamable HTTP JSON-RPC 2.0 (`POST /mcp`), rate limiting, PII redaction, and audit logging.
- **Reactive Incremental Watch Compiler (`akcp compile --watch`)**: Real-time file watcher guided by the Semantic Knowledge Graph `impactMap` to compute downstream blast radius and recompile affected targets.
- **Human-In-The-Loop (HITL) Store**: Approval gating for high-risk agent operations with TTL-bound, single-use SHA-256 tokens backed by SQLite/Redis persistence.
- **Policy Cards Engine & Policy Linter (`akcp policy lint`)**: Declarative YAML governance supporting condition evaluations, environment scoping, conflict resolution, and static detection of shadowed, contradictory, and redundant rules.
- **Enterprise Compliance Bundles**: Turnkey, CI-linted policy templates mapped to GDPR, HIPAA, and SOC 2 requirements (`docs/specs/examples/compliance/`).
- **Semantic & Git Revision Diff Engine (`akcp diff`)**: AST-level diffing between knowledge bundles or Git revisions (`--from-git`, `--to-git`) with breaking-change severity classification.
- **Grounding & Adversarial Evaluation (`akcp evals`)**: Automated evaluation suites for prompt-injection defense (`--scenario prompt-injection`) and retrieval grounding Precision@k / Recall@k (`--scenario retrieval-grounding`).
- **Interactive Control Plane Dashboard & VSCode Extension**: Interactive SVG Semantic Graph & Blast Radius Explorer, Policy & Prompt Firewall Playground, and VSCode extension with OKF frontmatter diagnostics, `[[WikiLink]]` completions, Blast Radius hovers, and Context Budget CodeLenses.
- **Cryptographic State Reconciler & 3-Way Bidirectional OpenWiki Sync (`akcp reconcile --verify-hashes` & `akcp sync`)**: SHA-256 artifact drift detection and 3-way conflict-aware synchronization between governed OKF bundles and OpenWiki repositories.
- **Autonomous Governed OKF Synthesis (`akcp synthesize`)**: Automated frontmatter synthesis, PII/secret-driven sensitivity elevation, and semantic `[[WikiLink]]` auto-discovery.
- **Governed Cloud Infrastructure & Webhook Adapters**: Kubernetes remediation adapter (`rollout restart`, `scale`, `rollback`, `logs`) with namespace allowlists and change-window gates, plus HMAC-SHA256 Signed Webhook adapter with SSRF protection and W3C TraceContext propagation.
- **Federated Knowledge Registries (`akcp registry`)**: Cross-domain bundle publication, Ed25519 signature verification, collision detection, and Federated Knowledge Mesh composition.
- **Production Reference Domains**: Golden compiler snapshots and verification for `career`, `it-operations`, and `customer-support`.

---

## 🟡 Experimental (In Active Development)

Features undergoing active engineering and API stabilization:

- **Hardware Security Module (HSM) & Cloud KMS Signers**: PKCS#11 and cloud KMS key-wrapping backends for `akcp sign`.
- **Distributed Multi-Cluster MCP Federation**: Cross-region state replication for HITL approval stores.

---

## 🔵 Research (Exploratory)

Architectural investigations scoped for future major initiatives:

- **Zero-Knowledge Policy Proofs**: Cryptographic proofs of policy evaluation without revealing sensitive context attributes.
- **Formal Verification of Policy Cards**: SMT-solver backed equivalence and reachability proofs across policy sets.

---

## Community Participation & RFCs

AKCP follows an open Request for Comments (RFC) model for architectural evolution. To participate or propose changes:

1. Review existing proposals in [docs/rfcs/](docs/rfcs/).
2. Consult the [RFC Governance Process](docs/governance/rfc-process.md).
3. Submit a proposal using the [RFC Template](docs/rfcs/template.md).
