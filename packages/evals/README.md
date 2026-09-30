# @akcp/evals

Evaluation benchmarks, prompt-injection defense testing, retrieval grounding metrics, and knowledge readiness scorecards for AKCP agent knowledge bundles.

## Evaluation Suites & Methodology

The `@akcp/evals` package provides structured, reproducible evaluations across three critical dimensions of agent knowledge systems:

### 1. Prompt Injection Defense Evaluation (`runPromptInjectionEval`)

Evaluates the robustness of the Security Gateway and WAF heuristics against adversarial attacks aligned with OWASP Top 10 for LLM Applications (LLM01:2025):

- **Corpus Coverage (≥50 Scenarios)**:
  - **Direct Instruction Overrides**: Instruction negation, context wipes, emergency stop overrides, and system prompt extraction across multiple languages (English, Portuguese, Spanish, etc.).
  - **Indirect Context Injections**: Fake administrative directives, simulated SecOps overrides, and privilege escalation notices embedded within data.
  - **Jailbreaks & Personas**: DAN (Do Anything Now), SID, developer mode simulations, unrestricted AI roles, and delimiter attacks (`[SYSTEM]`, `<<SYS>>`, ````system`).
  - **Obfuscation & Encoding**: Base64-encoded payloads, eval-constructs, and obfuscated string concatenation.
  - **Benign Canary Queries**: Legitimate developer queries used to measure and enforce a strict false-positive rate threshold (≤ 10%).
- **Pass Criteria**: Baseline regex fallback detection rate ≥ 40% (≥ 80% on standard attacks) with false-positive rate ≤ 10%.

### 2. Retrieval Grounding Evaluation (`runRetrievalGroundingEval`)

Measures retrieval quality, relevance ranking, and grounding precision of the `ContextPacker` and `ContextPlanner` across multi-domain knowledge bundles:

- **Metrics**:
  - **Precision@K**: The fraction of retrieved documents within top-$K$ slots that match ground-truth relevant concepts. Target: $\text{Precision}@K \ge 0.8$.
  - **Recall@K**: The proportion of all relevant concepts successfully retrieved in the packed context window.
  - **Hit Rate**: The percentage of test queries for which at least one relevant document is included in the top-$K$.
- **Corpus**: Evaluates against a representative corpus spanning IT operations runbooks, customer support policies, GDPR compliance workflows, engineering coding standards, and zero-trust gateway architectures.

### 3. CLEAR Metrics Benchmark (`EvalsHarness`)

Compares raw/unstructured documentation baselines against compiled OKF knowledge bundles across eight key metrics:

1. **Task Success**: Rate of successfully completed tasks.
2. **Token Cost**: Total token consumption per task.
3. **Latency**: End-to-end execution latency (ms).
4. **Tool Selection Accuracy**: Correctness of tools chosen by the agent.
5. **Hallucination Rate**: Frequency of unsupported or fabricated claims.
6. **Citation Accuracy**: Traceability back to source OKF document provenance.
7. **Unsafe Action Rate**: High-risk or policy-violating tool invocations without authorization.
8. **Context Utilization**: Ratio of relevant tokens to total packed context tokens.

### 4. Agent Knowledge Readiness Scorecard

Analyzes compiled bundles and produces letter-grade scores (A through F) with actionable remediation recommendations covering concept depth, policy coverage, documentation freshness, and governance posture.

---

## Running Evaluations

### Automated Test Suite

To run all evaluation unit tests (including prompt injection, retrieval grounding, and scorecard benchmarks):

```bash
pnpm --filter @akcp/evals test
```

### Full Benchmark Suite

To execute full scenario runs and generate JSON / Markdown evaluation reports:

```bash
pnpm --filter @akcp/evals evals
```

Reports will be written to `reports/evals-report.json` and `reports/benchmark-report.md`.
