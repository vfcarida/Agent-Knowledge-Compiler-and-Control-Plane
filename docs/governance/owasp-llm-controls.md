# OWASP Top 10 for LLM Applications

AKCP mitigates major OWASP LLM vulnerabilities by design. Numbering below follows the
[**2023** list](https://genai.owasp.org) (the version reflected in the `[LLM0X: ...]` tags
throughout `packages/core/src` error messages, e.g. `capabilities/gateway.ts`, `domain/policy.ts`).
The **2025** revision renumbered several categories and added two new ones not covered by any
control below yet — see the note at the bottom.

| OWASP Risk                           | Mitigation in AKCP                                                                                                                                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LLM01: Prompt Injection**          | OKF strictly parses YAML. Malicious markdown bodies do not execute code. Additionally, `privacy/waf.ts` provides regex/Lakera-based prompt-injection screening as defense-in-depth — see the note on the "lethal trifecta" below. |
| **LLM02: Insecure Output Handling**  | MCP capabilities enforce schema validation before execution.                                                                                                                                                                      |
| **LLM06: Sensitive Info Disclosure** | The `ContextPacker` applies dynamic PII Redaction based on the `AgentPolicy`. See [docs/security/pii-redaction.md](../security/pii-redaction.md) for the current regex + opt-in heuristic-NER coverage and its documented gaps.   |
| **LLM07: Insecure Plugin Design**    | The Capability Registry requires explicit risk and side-effect declarations for all tools.                                                                                                                                        |
| **LLM08: Excessive Agency**          | Autonomy Levels (`observe`, `advise`) physically block the LLM from executing writes, regardless of its prompt instructions.                                                                                                      |
| **LLM09: Overreliance**              | Evals pipeline measures Citation Accuracy to ensure provenance is always maintained.                                                                                                                                              |

## Not yet covered: 2025 additions

The [2025 OWASP Top 10 for LLM Applications](https://genai.owasp.org) added two categories with
no dedicated AKCP control yet:

- **LLM07 (2025): System Prompt Leakage** — no control currently prevents a compiled AK-IR concept
  or tool response from echoing back an agent's system prompt/instructions.
- **LLM08 (2025): Vector and Embedding Weaknesses** — not applicable to AKCP's compiled-context
  approach today (no vector store/embedding retrieval in the compiler or control plane), but worth
  re-checking if a RAG-style connector is added later.

## Prompt injection defense posture

`privacy/waf.ts`'s regex/Lakera-based screening is **defense-in-depth, not a complete solution** —
per Simon Willison's ["lethal trifecta"](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)
framing, prompt injection becomes dangerous specifically when an agent combines (a) private data
access, (b) exposure to untrusted content, and (c) a way to exfiltrate data externally. The more
durable mitigation is architectural — restricting which compiled knowledge sources can trigger
external-write capabilities — not just pattern-matching on the prompt text.
