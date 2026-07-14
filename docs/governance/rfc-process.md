# Request for Comments (RFC) Process

The RFC process is intended to provide a consistent and controlled path for new features, normative spec changes, and major architectural shifts in AKCP.

## When to write an RFC

You need an RFC if your change:
- Modifies any normative specification (AK-IR, Policy Cards, `akcp.yaml`).
- Introduces a new compile target (e.g. exporting to a new Vector DB).
- Adds a new flagship domain (e.g. Legal Discovery).
- Makes breaking changes to the `@akcp/core` public API.
- Significantly alters the security model or capability registry.

You do **not** need an RFC for:
- Bug fixes.
- Performance improvements.
- Documentation updates.
- Adding tests or evals.

## The RFC Lifecycle

1. **Draft:** Create a PR adding your proposal to `docs/rfcs/drafts/` using the RFC template.
2. **Proposed:** The PR is open for community comment for at least 7 days.
3. **Accepted:** A core maintainer approves and merges the PR, moving the doc to `docs/rfcs/accepted/`.
4. **Implemented:** The code changes are merged into `main` and released.

## How to submit

1. Copy the `docs/rfcs/template.md`.
2. Fill out the Motivation, Proposed Design, Drawbacks, and Alternatives.
3. Open a Pull Request titled `RFC: <Your Feature>`.
