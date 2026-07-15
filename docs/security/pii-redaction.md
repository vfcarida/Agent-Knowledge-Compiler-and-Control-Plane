# PII Redaction Strategy

Agent Knowledge Compiler and Control Plane (AKCP) strictly enforces data privacy through its PII Redaction Pipeline, particularly crucial in domains like Customer Support where agents interact with sensitive customer data.

## Classification

All fields and telemetry traversing the Control Plane are classified using a multi-layered approach:

1. **Schema-Level Annotations:** MCP tools explicitly declare their PII handling (e.g., `readsPII: true`, `writesPII: true`).
2. **Deterministic Heuristics:** Fast, regex-based matching for well-known patterns (SSN, credit cards, emails).
3. **ML-Based Identification:** (Optional) Integration with platforms like [Presidio](https://github.com/data-privacy-stack/presidio) or Google Sensitive Data Protection for contextual PII discovery (e.g., recognizing names in unstructured chat).

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
