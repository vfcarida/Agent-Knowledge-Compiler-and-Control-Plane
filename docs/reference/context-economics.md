# Context Economics

The **Context Economics** subsystem is responsible for optimizing the context window of AI agents by selecting, prioritizing, and optionally compressing knowledge documents. Since context windows are limited and cost money per token, the Orchestrator applies explicit deterministic governance over what enters an agent's context.

## Core Concepts

### 1. Token Estimator (`TokenEstimator`)

A deterministic, LLM-agnostic heuristic token estimator.

- It uses a standard heuristic `(1 token ~= 4 chars)` rather than embedding a heavy LLM tokenizer.
- This ensures fast execution and zero third-party dependencies while providing a reliable baseline for budget planning.

### 2. Relevance Score (`RelevanceScore`)

Calculates a deterministic relevance score (0.0 to 1.0) for each document against a specific task.
The score is influenced by:

- **Explicit Priority:** Driven by the document's frontmatter `priority` field (e.g., `high`, `critical`).
- **Task Keywords:** Matching keywords from the task description against the document's `title` and `tags`.
- **Type Matching:** If the task mentions the document's `type`.

### 3. Context Plan & Manifest (`ContextPlanner`)

The planner takes a list of documents, calculates relevance scores, estimates token counts, and applies the `ContextBudget`.
It outputs a `ContextPackManifest` documenting exactly:

- `documentsIncluded`: Which documents were selected and their estimated cost.
- `documentsExcluded`: Which documents were dropped and the exact reason (e.g., "Budget Exceeded").

## Command Line Usage

You can test context economics locally using the `akcp context plan` command.

```bash
akcp context plan --task "tailor resume" --budget 12000
```

This will output an economics report showing exactly which documents make the cut and which are excluded.
