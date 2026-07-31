# PII Redaction Strategy

Agent Knowledge Compiler and Control Plane (AKCP) strictly enforces data privacy through its PII Redaction Pipeline, particularly crucial in domains like Customer Support where agents interact with sensitive customer data.

## Classification

All fields and telemetry traversing the Control Plane are classified using a multi-layered approach:

1. **Schema-Level Annotations:** MCP tools explicitly declare their PII handling (e.g., `readsPII: true`, `writesPII: true`).
2. **Deterministic Heuristics:** Fast, regex-based matching for well-known patterns (SSN, credit cards, emails) — `RegexPiiDetector` in `packages/core/src/privacy/regex-pii-detector.ts`.
3. **Heuristic Name Detection (opt-in, dependency-free):** `NerLiteDetector` (`packages/core/src/privacy/ner-lite-detector.ts`) catches free-text person names via honorific-prefixed and Title Case patterns, always at `low`/`medium` confidence — never `high`, so it can't trigger high-confidence-gated blocking on its own. Enable it by passing `{ enableNerLite: true }` to `createPiiDetector()`; it's off by default since it's best-effort and can add both false positives and negatives.
4. **ML-Based Identification:** (Not yet implemented) Real NER via a trained model — e.g. [Microsoft Presidio](https://github.com/microsoft/presidio) or spaCy — is the documented upgrade path once the heuristic detector above proves insufficient. This requires a Python runtime or a bundled ONNX/WASM model, neither of which this package currently depends on.

## Redaction Policies

When an agent requests an action or retrieves context:

- **Pre-Flight Redaction:** Before context is sent to the LLM, sensitive fields (like credit card numbers) are redacted or masked (e.g., `[REDACTED_CREDIT_CARD]`) based on the domain's `akcp.yaml` rules.
- **Post-Flight Audit Scrubbing:** Before saving to the immutable Audit Log, all PII defined in `disableInLogs` is aggressively scrubbed to prevent data leaks in the telemetry system.

### Example Configuration

```yaml
controlPlane:
  policies:
    disableInLogs:
      - "ssn"
      - "credit_card"
      - "password"
      - "auth_token"
      - "email"
      - "phone_number"
```

## Zero-Trust Boundary

The Control Plane acts as a zero-trust boundary. It assumes the LLM is hostile or compromised. Therefore, the agent never sees the raw PII unless strictly required by a specific, policy-allowed capability (e.g., drafting an email), and even then, the capability execution is gated by Human-In-The-Loop approvals.
