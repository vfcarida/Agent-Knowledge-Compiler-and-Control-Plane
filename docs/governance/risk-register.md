# Risk Register

| Risk ID   | Description                                                                  | Severity | Mitigation Strategy                                                                  | Status    |
| --------- | ---------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ | --------- |
| **R-001** | Agent autonomously submits external application or modifies production code. | Critical | Enforce `act-with-approval` policy and Capability Registry `requiredApproval: true`. | Mitigated |
| **R-002** | Agent leaks personal identifiable information (PII) to an external LLM API.  | High     | Set `piiHandling: 'redact'` in ContextPacker policy.                                 | Mitigated |
| **R-003** | Context flooding causes the LLM to hallucinate instructions.                 | Medium   | Use Context Budgeting (`balanced` mode) to enforce strict max tokens.                | Mitigated |
| **R-004** | Agent executes a deprecated or poisoned tool.                                | High     | CI pipeline strictly validates `capabilities.json` schemas against evals.            | Mitigated |
