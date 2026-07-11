# Release Process

This document outlines the release process for the Agent Knowledge Compiler and Control Plane (AKCP).

## Current Release Status

The repository is currently in an **internal development** phase. Many core packages are marked as `"private": true` and are **not** published to the public NPM registry.

While the CI/CD pipeline contains a `.github/workflows/release.yml` file, it currently acts as a **draft/manual** mechanism that simply compiles the code and generates a GitHub Release tag. **It does not perform an automated `npm publish`.**

## Preparing for Public Release

When the project matures to a state where public distribution is required, the following steps must be taken to harden the release pipeline:

1. **Remove `private: true`**:
   Update `package.json` for target packages (e.g. `@ocf/core`, `@ocf/cli`, `@ocf/mcp-profile-server`, `@ocf/mcp-automation-server`) to remove `"private": true`.

2. **Implement Changesets**:
   Adopt a robust versioning tool such as [Changesets](https://github.com/changesets/changesets) to manage SemVer versioning and Changelog generation automatically across the monorepo.

3. **Provenance and SBOM**:
   Ensure the `npm publish` step runs with `--provenance` to guarantee supply chain security via the NPM registry. Consider generating a Software Bill of Materials (SBOM) for the release payload.

4. **Update `release.yml`**:
   Introduce the NPM registry authentication steps (via `NODE_AUTH_TOKEN`) and run `npm publish` only for stable builds triggered by SemVer tags.

Until these criteria are met, releases should be managed strictly via source control and manual tag drops in GitHub.
