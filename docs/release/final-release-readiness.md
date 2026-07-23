# Final Release Readiness Gate

Before any release of the Agent Knowledge Compiler and Control Plane (AKCP) can be cut or published, it must pass the final release readiness gate. This gate is automated via the `pnpm release:check` command.

## Automated Checks (`pnpm release:check`)

The `pnpm release:check` command acts as a strict aggregator of all our quality, security, and identity checks. It ensures:

1. **Dependency Integrity (`pnpm install --frozen-lockfile`)**: The lockfile is fully in sync with `package.json` requirements.
2. **Static Analysis (`pnpm run lint` & `pnpm run typecheck`)**: Code quality and typing are strictly enforced.
3. **Test Suites (`pnpm run quality:gate`)**: All unit, integration, conformance, and security/contract tests pass, and coverage thresholds are met.
4. **Metadata Alignment (`pnpm run check:metadata`)**: All workspace `package.json` files use correct `@akcp` names, URLs, and licenses. No legacy terminology in descriptions.
5. **Brand Identity (`pnpm run check:identity`)**: The entire repository is free of unauthorized legacy names (e.g. `OCF`, `ContextOps`).
6. **Documentation Health (`pnpm run check:docs` & `pnpm run check:links`)**: Mandatory architecture/security files are present and all internal markdown links resolve correctly.
7. **Flagship Domain Stability (`pnpm run examples:validate`)**: All standard flagship domains (Career, IT Operations, Customer Support) compile and pass strict schema validation against the latest compiler.

## Release Blockers

If any of the above automated checks fail, the release is blocked. You must fix the underlying code, tests, or documentation, and ensure `pnpm release:check` passes completely before proceeding.

### Interpreting Failures

- **Metadata/Identity Failures**: If `check:metadata` or `check:identity` fail, it means you've introduced legacy names or invalid properties. Fix them by updating the affected `package.json` or source files.
- **Example Failures**: If `examples:validate` fails, a change in the compiler or core schema broke one of our flagship domain examples. You must update the example OKF YAML/JSON files to conform to the new schema before releasing.
- **Tests**: If `quality:gate` fails, a unit or security test is failing. Fix the logic or update the test contract.

## Manual Metadata Checklist

While code changes are gated by CI, the GitHub UI must be manually verified.
Review [docs/release/repository-metadata.md](repository-metadata.md) to ensure the GitHub About section and tags are correct.
