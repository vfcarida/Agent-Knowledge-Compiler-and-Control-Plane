# ADR-003: Human-in-the-Loop Gate for External Side-Effects

## Status

Accepted

## Context

Submitting applications or editing external platform details are high-risk actions. Allowing LLM agents to perform these operations automatically without verification can result in corrupted submissions or account bans.

## Decision

We mandate a multi-step Human-In-The-Loop check:

1.  `preview_application`: Gathers vacancy fields.
2.  `prepare_application`: Validates and generates a stateful `approvalToken`.
3.  `confirm_application_submission`: Requires verification of the token to submit.

## Consequences

- Elevates system safety and candidate control.
- Keeps audit trails for all actions.
