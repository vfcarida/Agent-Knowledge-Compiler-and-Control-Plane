# Architectural Decision Records (ADRs)

While the [RFC Process](../rfcs/README.md) governs changes to the public standard, protocols, and schemas, Architectural Decision Records (ADRs) are used to document **internal engineering decisions**.

## When to use an ADR
Write an ADR when making a significant technical choice about the implementation details of the repository, such as:
- Choosing a new testing framework (e.g., migrating to Vitest).
- Changing the internal project architecture (e.g., moving to a monorepo).
- Adopting a specific design pattern for the React dashboard.

## ADR Format
ADRs in this project should follow a simplified format:
- **Title:** The decision being made.
- **Context:** The forces at play and why a decision is needed.
- **Decision:** The choice we made.
- **Consequences:** What becomes easier or harder as a result of this choice.

Store new ADRs in this directory as `YYYY-MM-DD-short-title.md`.
