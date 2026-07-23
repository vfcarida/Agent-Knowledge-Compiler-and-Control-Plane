# OWASP Top 10 for LLM Applications

AKCP mitigates major OWASP LLM vulnerabilities by design.

| OWASP Risk                           | Mitigation in AKCP                                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **LLM01: Prompt Injection**          | OKF strictly parses YAML. Malicious markdown bodies do not execute code.                                                     |
| **LLM02: Insecure Output Handling**  | MCP capabilities enforce schema validation before execution.                                                                 |
| **LLM06: Sensitive Info Disclosure** | The `ContextPacker` applies dynamic PII Redaction based on the `AgentPolicy`.                                                |
| **LLM07: Insecure Plugin Design**    | The Capability Registry requires explicit risk and side-effect declarations for all tools.                                   |
| **LLM08: Excessive Agency**          | Autonomy Levels (`observe`, `advise`) physically block the LLM from executing writes, regardless of its prompt instructions. |
| **LLM09: Overreliance**              | Evals pipeline measures Citation Accuracy to ensure provenance is always maintained.                                         |
