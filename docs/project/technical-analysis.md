# AKCP Technical Architecture Analysis & System Baseline

> Comprehensive technical evaluation, ecosystem positioning, and empirical verification baseline for the Agent Knowledge Compiler and Control Plane (AKCP).

---

## 1. Executive Summary

The Agent Knowledge Compiler and Control Plane establishes a verifiable, compile-time to runtime lineage architecture:
answering definitively **"which document version authorized this specific agent action?"** across three operational tiers:

1. **Ecosystem Alignment**: Treating standard Open Knowledge Format (OKF) as a first-class input and output target provides native compatibility with enterprise knowledge graphs and agent specifications.
2. **Deterministic Developer Experience**: Ensuring quickstart commands, golden domain compilations, and control-plane servers execute deterministically without ambient configuration drift.
3. **Capability Delivery & Hardened Gates**: Enforcing strict schema validation, AST normalization, Zero-Trust policy evaluation, and cryptographic provenance checks.

The architectural foundation (compiler pipeline, policy engine, HITL store, and typed IR) provides a production-grade substrate with automated property verification and high branch coverage.

---

## 2. Empirical Verification Baseline

### Test Suite & Code Coverage (v8)

| Area / Package                  | Statements | Branches | Functions | Status  |
| :------------------------------ | :--------- | :------- | :-------- | :------ |
| **@akcp/core**                  | ≥ 80%      | ≥ 75%    | ≥ 80%     | Passing |
| **@akcp/mcp-profile-server**    | ≥ 80%      | ≥ 75%    | ≥ 80%     | Passing |
| **@akcp/mcp-automation-server** | ≥ 75%      | ≥ 70%    | ≥ 75%     | Passing |

### Property-Based and Invariant Verification

| Component               | Verification Type | Scope & Guarantees                                          |
| :---------------------- | :---------------- | :---------------------------------------------------------- |
| **IR Schema & Builder** | Property Testing  | `fast-check` guarantees round-trip AST integrity            |
| **Regex PII Detector**  | Invariant Tests   | Verified against international PII token patterns           |
| **PII Redactor**        | Invariant Tests   | Deterministic redaction token emission and masking          |
| **Compiler Pipeline**   | Golden Snapshots  | Multi-stage AST normalization with cross-platform snapshots |
| **Policy Engine**       | Invariant Tests   | Deterministic rule priority, condition evaluation & deny    |

---

## 3. Architecture & Positioning

### 3.1 Ecosystem Architecture

- **Open Knowledge Format (OKF)**: Standard Markdown frontmatter per concept, links as graph edges, `index.md`/`log.md`.
- **AKCP Role**: _The compiler and control plane for OKF and Context Packs_ — providing deterministic AST compilation, typed Intermediate Representation (AK-IR), policy evaluation cards, and Human-In-The-Loop gating on top of standard knowledge sources.

### 3.2 Landscape Matrix

| Category                     | Industry Pattern                             | AKCP Architectural Design                                                |
| :--------------------------- | :------------------------------------------- | :----------------------------------------------------------------------- |
| **Knowledge Packaging**      | `AGENTS.md` and `SKILL.md` instruction files | **Compile TO these targets** (`agents-md` target, `skill-md` target)     |
| **MCP Gateways**             | Network-level reverse proxies                | **Semantic Policy Plugin**: Payload-aware, risk-tiered policy cards      |
| **Human-In-The-Loop (HITL)** | Ad-hoc middleware approvals                  | **Lineage Gating**: Approvals bound to cryptographic artifact hashes     |
| **Compliance & Audit**       | Post-hoc log scraping                        | **Deterministic Evidence Export**: Verifiable JSON/JSONL compliance logs |

---

## 4. Key Architectural Pillars

1. **Strict Compiler Verification**: `--strict` parsing catches malformed frontmatter, broken links, and policy syntax errors with precise source attribution.
2. **Deterministic Manifests**: Portable `akcp-manifest.json` generation scrubbed of absolute machine paths for reliable snapshot testing across platforms.
3. **Fail-Closed Security**: Profile and automation servers enforce authentication by default over remote transports, requiring explicit opt-ins for local testing.

---

## 5. Verification Framework

1. **Automated Release Gating**: `pnpm release:check` combines linting, typechecking, test suites, metadata alignment, and link integrity into a single gate.
2. **Property-Based Testing**: `fast-check` tests validate arbitrary JSON and string permutations across IR schemas, PII detectors, and policy evaluate engines.
3. **End-to-End Browser Testing**: Playwright UI tests enforce dashboard visual integrity, audit trail rendering, and HITL approval flows.
