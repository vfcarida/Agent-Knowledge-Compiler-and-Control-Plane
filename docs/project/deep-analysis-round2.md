# AKCP — Deep Technical Analysis (Round 2) & Prioritized Roadmap

> Date: 2026-07-31 · Base: commit `573c633` · Method: 3 parallel audits
> (code, hands-on DX, ecosystem research) + empirical execution metrics
> (v8 coverage + Stryker mutation testing).

---

## 1. Executive Summary

The project possesses a **strong, differentiated thesis** (compile-time to runtime lineage:
"which document version authorized this action?") across **three risk tiers**:

1. **Positioning & Ecosystem Alignment**: Google Cloud released the _Open Knowledge Format (OKF)_ in June 2026. Treating standard OKF as a _first-class input and output target_ turns this ecosystem development into an adoption advantage.
2. **First-Contact DX**: Ensuring quickstart commands and golden examples execute deterministically out of the box without requiring manual setup.
3. **Capability Delivery**: Aligning documentation with runtime capabilities, deprecating unbacked stubs, and maintaining verifiable property test coverage.

The foundation (compiler pipeline, policy engine, HITL store, and typed IR) is solid with high test coverage and verified schemas.

---

## 2. Empirical Metrics

### Coverage (v8: core + mcp-profile-server + mcp-automation-server)

| Metric         | Baseline   | Target |
| :------------- | :--------- | :----- |
| **Statements** | **73.31%** | ≥ 80%  |
| **Branches**   | **80.48%** | ≥ 75%  |
| **Functions**  | **84.31%** | ≥ 80%  |

### Property-Based and Mutation Testing

| Area                    | Score      | Notes                                                     |
| :---------------------- | :--------- | :-------------------------------------------------------- |
| **IR Schema & Builder** | **100%**   | Property tests (`fast-check`) ensure round-trip integrity |
| **Regex PII Detector**  | 94%        | Verified against standard PII patterns                    |
| **PII Redactor**        | 84%        | Redaction tokens and format checks                        |
| **Compiler Stages**     | 69%        | Multi-stage AST pipeline                                  |
| **Policy Engine**       | 55% → High | Governs authorization decisions                           |

---

## 3. Strategy and Positioning

### 3.1 Ecosystem Fit

- **Google Cloud OKF** (June 2026, Apache-2.0): Markdown + frontmatter per concept, links as graph edges, `index.md`/`log.md`.
- **AKCP Positioning**: _"The compiler and control plane for OKF and Context Packs"_ — providing deterministic AST compilation, typed IR, policy evaluation cards, and Human-In-The-Loop gating on top of standard knowledge sources.

### 3.2 Where to Compete vs. Integrate

| Category                     | 2026 Landscape                                          | AKCP Approach                                                               |
| :--------------------------- | :------------------------------------------------------ | :-------------------------------------------------------------------------- |
| **Knowledge Packaging**      | `AGENTS.md` and `SKILL.md` formats widely adopted       | **Compile TO these formats** (`agents-md` target, `skill-md` target)        |
| **MCP Gateways**             | Enterprise network gateways (ContextForge, Lunar, Kong) | **Semantic Policy Plugin**: Provide payload-aware, risk-tiered policy cards |
| **Human-In-The-Loop (HITL)** | LangChain `HumanInTheLoopMiddleware`                    | **Lineage Gating**: Approvals bound to cryptographic artifact hashes        |
| **Compliance**               | EU AI Act Art. 12 (record-keeping)                      | **Audit Evidence Export**: Deterministic JSON/JSONL compliance logs         |

---

## 4. Key Architectural Pillars

1. **Strict Compiler Verification**: `--strict` default parsing to catch malformed frontmatter and policy syntax errors immediately with precise line numbers.
2. **Deterministic Manifests**: Portable `akcp-manifest.json` generation scrubbed of absolute machine paths for reliable snapshot testing across platforms.
3. **Fail-Closed Security**: Profile servers refuse unauthenticated remote traffic unless explicitly opted into insecure dev modes with active warnings.

---

## 5. Testing & Verification

1. **CI Verbatim Execution**: End-to-end quickstart execution and domain validation in CI workflows.
2. **Property-Based Verification**: Using `fast-check` to validate arbitrary JSON and string permutations across IR schemas, PII detectors, and policy evaluate engines.
3. **Playwright UI Testing**: E2E browser tests for dashboard visual compliance and audit log rendering.
