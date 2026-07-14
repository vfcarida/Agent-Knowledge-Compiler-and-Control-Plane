## Description

Please include a summary of the changes and the related issue or specification they resolve.

- Fixes # (issue)
- Implements architectural plan in `docs/` or `ADR-`

## Spec-Driven Development (SDD) Compliance

- [ ] Architectural boundaries respected (no leaked dependencies/side-effects).
- [ ] Zod schemas updated/created in `@akcp/core` `schemas.ts` if adding new fields.
- [ ] Comprehensive unit, integration, or contract tests added for changes.
- [ ] Conformance tests run and passing (`pnpm test` in `packages/conformance`).
- [ ] Security considerations reviewed against the [Security Review Guide](docs/contributing/security-review.md) (required for Control Plane changes).
- [ ] Relevant documentation updated (specs, walkthroughs, or architecture).
- [ ] Bundle backward compatibility verified and migration path documented.
- [ ] No mention of AI, LLMs, or agent assistants in the commit messages or code comments.

## Verification Checklist

- [ ] `pnpm run lint` passes without warnings.
- [ ] `pnpm run typecheck` passes.
- [ ] `pnpm run test` passes (Vitest run).
- [ ] `pnpm run build` compiles successfully.
- [ ] OpenTelemetry spans verified.
