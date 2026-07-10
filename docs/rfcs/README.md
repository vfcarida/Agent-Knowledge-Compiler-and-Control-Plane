# Request for Comments (RFCs)

The RFC (Request for Comments) process is the primary mechanism for proposing major changes to the AKCP Specification, OKF Profiles, and MCP Tool Contracts.

By requiring a structured RFC for significant changes, we ensure that:
- The problem is clearly understood before a solution is engineered.
- Design alternatives are thoroughly explored.
- The impact on existing agents and context packs (compatibility) is rigorously assessed.
- There is a clear paper trail of *why* a protocol decision was made.

## When to write an RFC

You MUST write an RFC for:
- Introducing a new core OKF Profile (e.g., HR, IT Operations).
- Adding a new MCP Tool to the standard servers.
- Making any **Breaking Change** to the specs, profiles, or capabilities.
- Introducing a major new architectural component to the repository.
- Any normative change to documents in the `spec/` directory.

You DO NOT need an RFC for:
- Bug fixes.
- Internal refactoring that does not change the public API or CLI behavior.
- Minor documentation updates.
- Internal engineering decisions (use [ADRs](../adrs/README.md) for these).

## RFC Workflow

1. **Draft:** Copy the [RFC Template](template.md) and create a draft PR. The file should be named `YYYY-MM-DD-short-title.md`.
2. **Discuss:** Gather feedback from maintainers and the community.
3. **Resolve:** Address feedback and establish a clear Test Plan and Migration Path.
4. **Accept:** The RFC is merged into the `docs/rfcs/` directory.
5. **Implement:** Development begins directly based on the accepted RFC.

## Spec Governance

Changes to the `spec/` directory are subject to an **extended review period of 7 days minimum** due to their potential impact on all AKCP-compliant implementations. See [ADR-spec-governance.md](../adrs/ADR-spec-governance.md) for the rationale.

## Accepted RFCs

| RFC | Title | Spec Section | Status |
|-----|-------|--------------|--------|
| — | (none yet) | — | — |


By requiring a structured RFC for significant changes, we ensure that:
- The problem is clearly understood before a solution is engineered.
- Design alternatives are thoroughly explored.
- The impact on existing agents and context packs (compatibility) is rigorously assessed.
- There is a clear paper trail of *why* a protocol decision was made.

## When to write an RFC
You MUST write an RFC for:
- Introducing a new core OKF Profile (e.g., HR, IT Operations).
- Adding a new MCP Tool to the standard servers.
- Making any **Breaking Change** to the specs, profiles, or capabilities.
- Introducing a major new architectural component to the repository.

You DO NOT need an RFC for:
- Bug fixes.
- Internal refactoring that does not change the public API or CLI behavior.
- Minor documentation updates.
- Internal engineering decisions (use [ADRs](../adrs/README.md) for these).

## RFC Workflow
1. **Draft:** Copy the [RFC Template](template.md) and create a draft PR. The file should be named `YYYY-MM-DD-short-title.md`.
2. **Discuss:** Gather feedback from maintainers and the community.
3. **Resolve:** Address feedback and establish a clear Test Plan and Migration Path.
4. **Accept:** The RFC is merged into the `docs/rfcs/` directory.
5. **Implement:** Development begins based directly on the accepted RFC.
