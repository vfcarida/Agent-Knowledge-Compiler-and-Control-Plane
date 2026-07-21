# Eval Fixtures

This directory is reserved for static JSONL fixture files used by the `@akcp/evals` test suite.

## TODO

Add evaluation fixture files here. Example format:

```jsonl
{
  "input": "What is the on-call process?",
  "expected_grounding": "runbook-on-call.md",
  "domain": "it-operations"
}
```

For prompt injection scenarios, see [`../src/prompt-injection-dataset.json`](../src/prompt-injection-dataset.json).
