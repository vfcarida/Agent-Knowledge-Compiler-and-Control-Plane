# Release Process

This document describes the steps required to cut a new AKCP release. Follow this checklist in order. Do not skip steps.

---

## Pre-Release Checklist

### 1. Branch Health & Quality Gates

The `pnpm release:check` script is the ultimate gatekeeper for releases. It encompasses all tests, linting, metadata alignment, and identity checks.

```bash
# Run the final release gate
pnpm release:check
```

- [ ] `pnpm release:check` passes successfully.
- [ ] No open `P0` / `P1` security issues
- [ ] Maturity matrix is correctly applied (e.g. experimental features are marked as such)
- [ ] Check repository metadata against `docs/release/repository-metadata.md`

### 2. Secret Scanning

- [ ] GitHub Advanced Security secret scan shows no leaks
- [ ] No API keys, tokens, or PII in the release commit

### 3. CHANGELOG

- [ ] `CHANGELOG.md` `[Unreleased]` section updated with all changes
- [ ] Breaking changes clearly documented under `### Breaking Changes`

---

## Publishing a Release

1. Ensure all tests pass: `pnpm release:check`
2. Update version: `pnpm -r exec -- npm version <major|minor|patch>`
3. Update CHANGELOG.md
4. Commit: `git commit -am "chore: release vX.Y.Z"`
5. Tag: `git tag vX.Y.Z`
6. Push: `git push && git push --tags`

The release workflow will automatically:
- Build and test
- Publish to npm with provenance attestation
- Create a GitHub Release with auto-generated notes

## Verifying Provenance

Users can verify package provenance:

```bash
npm audit signatures @akcp/core
```

### Security Model
- Publishing uses OIDC trusted publishing (no long-lived tokens when configured)
- All packages include SLSA provenance attestations
- GitHub Release is created with SHA-locked assets

## Post-Release Verification

### Verify Artifact Attestation

```bash
# Verify the build provenance attestation for a release artifact
gh attestation verify packages/cli/dist/index.js \
  --repo vfcarida/Agent-Knowledge-Compiler-and-Control-Plane

# Verify the SBOM attestation
gh attestation verify sbom.spdx.json \
  --repo vfcarida/Agent-Knowledge-Compiler-and-Control-Plane
```

### Verify NPM Package Provenance

```bash
# After install, verify package signatures and provenance
npm audit signatures
```

### Inspect the SBOM

```bash
# Download sbom.spdx.json from the GitHub Release assets, then:
# List all packages in the SBOM
cat sbom.spdx.json | jq '.packages[] | .name + " " + .versionInfo'
```

### Confirm GitHub Release

- [ ] GitHub Release created with correct tag
- [ ] `sbom.spdx.json` attached as a release asset
- [ ] Auto-generated release notes are accurate
- [ ] npm packages visible at `https://www.npmjs.com/package/@akcp/<package>`

---

## Emergency Rollback

If a critical bug is discovered post-release:

1. **Do not delete the GitHub Release** — this breaks attestation chains.
2. Publish a patch release (e.g., `v0.2.1`) following this same checklist.
3. Add a `> [!CAUTION]` notice to the affected release's description.
4. Open a security advisory if the issue is a vulnerability.

---

## Related Docs

- [Supply Chain Security](../security/supply-chain.md)
- [Maturity Model](../project/maturity-model.md)
- [Release Policy](../governance/release-policy.md)
- [CHANGELOG](../../CHANGELOG.md)
