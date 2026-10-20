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
- **Control Plane CLI & Dashboard BFF (`akcp control-plane`, `akcp serve dashboard`)** — Precompiled Node.js Express BFF, native React 19 SPA bundling, Interactive SVG Blast Radius Graph, Policy/WAF Playground, and runtime inspection commands (`inspect`, `policies`, `approvals`, `audit`, `audit-verify`, `replay`).
- **Hybrid Retrieval & Epistemic Abstention Guard (`akcp context plan --strategy hybrid --enforce-abstention`)** — BM25 + L2 dense embeddings + Personalized PageRank fused via Reciprocal Rank Fusion (RRF), with calibrated grounding confidence and contradiction-aware abstention.
- **Cryptographic Provenance, KMS Envelope Keyring & CycloneDX v1.5 KBOM (`akcp sign`, `akcp verify`, `akcp keys`, `sbom-cyclonedx`)** — Ed25519 in-toto ITE-6 attestations, `AES-256-GCM` scrypt-wrapped key rotation/revocation, and CycloneDX v1.5 Knowledge & AI Bill of Materials generation.
- **Formal Policy Verifier, Selective-Disclosure Proofs & Red-Team Fuzzer (`akcp policy verify`, `akcp policy prove`, `akcp evals --scenario red-team`)** — Exhaustive finite-domain safety invariant verification, 256-bit Merkle witness selective disclosure, and adversarial policy/WAF fuzzing.
- **Reversible PII Token Vault, Macaroon Delegation & OCap Plugin Sandbox (`PiiTokenVault`, `DelegationMacaroonService`, `VmPluginSandbox`)** — Format-preserving `HMAC-SHA256` / `AES-256-GCM` PII tokenization, chained-HMAC attenuated sub-agent macaroons, and isolated `node:vm` plugin execution.
- **Bidirectional OpenWiki Sync, Autonomous OKF Synthesis, Federated Registries & Cloud Adapters (`akcp sync`, `akcp synthesize`, `akcp registry`)** — 3-way conflict-aware OpenWiki sync, automated OKF frontmatter synthesis, federated knowledge mesh composition, and governed Kubernetes/Signed-Webhook adapters.
- **Customer Support, IT Operations & Career Enterprise Domains (Stable)** — Reference domains with policies, capabilities, governed MCP tools, and golden compiler test verification.

---

## 🟡 Experimental (In Development)

These features are being actively developed and may change.

- **External PKCS#11 Hardware Tokens & Cloud KMS RPC Transports** — Direct hardware HSM slot bindings and remote AWS KMS / GCP Cloud KMS RPC key-wrapping adapters.

---

## 🔵 Research (Exploring)

These are speculative research directions. No implementation is planned yet.

- **Succinct Non-Interactive Arguments of Knowledge (zk-SNARKs / Groth16 / PlonK)** — Arithmetic circuit compilation for complex policy expressions.

---

## How to Influence the Roadmap

1. **Vote on existing issues** using 👍 reactions.
2. **Open a new issue** using the appropriate template (RFC, feature request, connector).
3. **Join the discussion** on open RFCs in [the RFC Process](rfc-process.md).

The roadmap is reviewed quarterly by the maintainer team.
