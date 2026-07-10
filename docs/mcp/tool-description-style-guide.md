# MCP Tool Description Style Guide

In Agentic architectures, the LLM relies entirely on tool descriptions (often mapped directly to its system prompt context window) to decide when and how to call tools. Poor descriptions lead to context flooding, hallucinated arguments, and unsafe side effects.

All MCP Tools in AKCP MUST follow this strict rubric. A Tool Smell test (`packages/evals/src/tool-smell.test.ts`) mathematically enforces these rules during CI.

## The Rubric

1. **Length Bounds**: Descriptions must be between 50 and 400 characters. Too short provides no context; too long dilutes the agent's context budget.
2. **Clear Purpose**: Start with an active verb (e.g., "Fetches", "Writes", "Submits").
3. **When to use / When NOT to use**: Clearly establish boundaries. If a tool is slow, state "When not to use: for simple lookups."
4. **Side Effects Declaration**: Explicitly state if the tool modifies the file system, network, or requires approval. Must include the exact string `Side effects:` or `Risk:`.
5. **Output Shape**: Mention briefly what the tool returns (e.g., "Returns a JSON context pack").
6. **Examples (For Critical Tools)**: If the tool has a risk level of `high` or `critical`, it MUST include a compact example string. Must include the exact string `Example:` or `Usage:`.

## Example of a Perfect Descriptor

```text
Fetches the entire OKF bundle and formats it based on a token budget.
When to use: You need broad context about the repository or profile.
When not to use: You only need a specific skill or document (use search_documents instead).
Side effects: local-read only (Safe).
```

## Example of a Bad Descriptor (Smell)

```text
Reads context.
```
*(Fails length, fails side-effect declaration, lacks usage boundaries).*
