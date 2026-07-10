# RFC: [Title]

- **Author(s):** [Names]
- **Date:** [YYYY-MM-DD]
- **Status:** [Draft | Accepted | Rejected | Implemented]

## 1. Problem Statement
Describe the problem you are trying to solve. Why is this an issue for AKCP users or autonomous agents? Focus on the *why* before the *how*.

## 2. Proposal
Describe the proposed solution in detail. Provide code snippets, JSON schemas, or Markdown examples. 
- If proposing a new MCP Tool, include the exact JSON Schema for its arguments.
- If proposing a new OKF Profile, include a sample Markdown file.

## 3. Alternatives Considered
What other approaches did you consider? Why were they rejected in favor of the proposal? (e.g., "We could have used pure RAG here, but it failed to guarantee X").

## 4. Compatibility Impact
Does this change break existing Context Packs, MCP clients, or agents? 
- If yes, detail the exact nature of the breaking change.
- Refer to the [Compatibility Policy](../specs/compatibility.md).

## 5. Migration Path
If there is a breaking change, how will existing users migrate? 
Provide the exact CLI commands or manual steps required (e.g., `akcp migrate --to v2`).

## 6. Test Plan
How will this feature be verified? Detail the specific Evals scenarios or unit tests that must pass before this RFC is considered implemented. (e.g., "We will run the `Tool Selection Ambiguity` eval to ensure the new capability description doesn't cause hallucination").
