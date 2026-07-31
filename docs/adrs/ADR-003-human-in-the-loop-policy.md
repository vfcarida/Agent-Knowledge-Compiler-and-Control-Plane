# ADR-003: Human-in-the-Loop Gate for External Side-Effects

## Status

Accepted

## Context

Submitting applications or editing external platform details are high-risk actions. Allowing LLM agents to perform these operations automatically without verification can result in corrupted submissions or account bans.

## Decision

We mandate a multi-step Human-In-The-Loop check:

1.  `preview_application`: Gathers vacancy fields.
2.  `prepare_application`: Validates and generates a stateful `approvalToken`, expiring in 15 minutes.
3.  `confirm_application_submission`: Requires verification of the token to submit.

Autonomous agents applying to jobs without consent violates user trust and can trigger ATS anti-spam measures — the two-step `prepare -> confirm` flow means agents cannot apply in the background while the user is away.

## Consequences

- Elevates system safety and candidate control.
- Keeps audit trails for all actions.

## History

Supersedes an earlier internal draft of this decision (previously tracked as a separate "-deprecated" file); consolidated here per [MADR](https://adr.github.io/madr/) convention of using a status field rather than a duplicate file.
