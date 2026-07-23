# Specification: Context Budget

## Objective

To reduce token costs, lower latency, and prevent LLM hallucination (context collapse) by introducing a strictly governed context envelope. Instead of dumping the entire OKF bundle into an LLM session, AKCP selects, compresses, and audits exactly what goes into the context window.

## Compression Modes

1. **`minimal`**: Exclusively serializes YAML frontmatter. Markdown body is dropped entirely. Useful for index-level navigation and high-level routing.
2. **`balanced`**: Preserves full frontmatter but truncates the Markdown body to the first 500 characters. Useful for reading overviews without paying for deep implementation details.
3. **`full`**: Serializes the full frontmatter and body, but strictly honors the token budget, omitting documents once the limit is hit.
4. **`audit`**: No compression and no omission. Serializes everything. The token budget acts purely as a warning. Only use when explicitly authorized.

## Token Estimation

Until a dedicated tokenizer (e.g. tiktoken) is embedded, estimation uses a deterministic heuristic:
`Estimated Tokens = Math.ceil(Character Count / 4)`
This offers a stable, offline, zero-dependency baseline.

## Provenance

Every compressed document maintains its absolute `conceptId` and `type` so that if an agent needs more detail, it can invoke specific `read_document` calls.

## Graceful Degradation (Omissions)

If a document does not fit within `maxTokens`, it is not silently lost. It is pushed into an `omitted` array with a clear reason (e.g., `Budget Exceeded`, `Irrelevant to task`), allowing the agent to know what it doesn't know.
