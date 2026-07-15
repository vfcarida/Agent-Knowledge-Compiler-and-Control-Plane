# Release Process

This document describes the steps required to cut a new AKCP release. Follow this checklist in order. Do not skip steps.

---

## Pre-Release Checklist

### 1. Branch Health

- [ ] All CI checks pass on `main` (green badge)
- [ ] No open `P0` / `P1` security issues
- [ ] `pnpm check:metadata` passes (all package properties are AKCP-compliant)
- [ ] `pnpm check:identity` passes (no legacy OCF references)
- [ ] `pnpm check:docs` passes (required docs present)
- [ ] `pnpm check:links` passes (no broken markdown links)
- [ ] Maturity matrix is correctly applied (e.g. experimental features are marked as such)
- [ ] Check repository metadata against `docs/release/repository-metadata.md`

### 2. Test Suite

```bash
# Run full test suite
pnpm test

# Run security tests
pnpm test:security

# Run contract tests
pnpm test:contract

# Run conformance tests
pnpm test:conformance
```

- [ ] All unit tests pass
- [ ] All security tests pass
- [ ] All contract tests pass
- [ ] All conformance tests pass

### 3. Flagship Domain Bundles

```bash
# Validate and compile all flagship domains
pnpm akcp validate --bundle examples/domains/career --profile career
pnpm akcp compile --config examples/domains/career/akcp.yaml

pnpm akcp validate --config examples/domains/it-operations/akcp.yaml
pnpm akcp compile --config examples/domains/it-operations/akcp.yaml
```

- [ ] Career domain compiles without errors
- [ ] IT Operations domain compiles without errors

### 4. Secret Scanning

- [ ] GitHub Advanced Security secret scan shows no leaks
- [ ] No API keys, tokens, or PII in the release commit

### 5. CHANGELOG

- [ ] `CHANGELOG.md` `[Unreleased]` section updated with all changes
- [ ] Breaking changes clearly documented under `### Breaking Changes`

---

## Tagging the Release

```bash
# Ensure you are on main and up-to-date
git checkout main
git pull origin main

# Create an annotated, signed tag (GPG or SSH signing recommended)
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0
```

> [!IMPORTANT]
> Pushing the `v*` tag triggers the release workflow automatically. Do **not** manually create the GitHub Release — let the workflow do it.

---

## Release Workflow Execution

The `.github/workflows/release.yml` workflow performs:

1. ✅ Install dependencies (`--frozen-lockfile --ignore-scripts`)
2. ✅ Build all packages (`pnpm run build`)
3. ✅ Generate SBOM (`anchore/sbom-action` → `sbom.spdx.json`)
4. ✅ Attest build artifacts (`actions/attest-build-provenance`)
5. ✅ Attest SBOM (`actions/attest-build-provenance`)
6. ✅ Publish to npm with `--provenance`
7. ✅ Create GitHub Release with auto-generated notes and `sbom.spdx.json` attached

Monitor the [Actions tab](https://github.com/vfcarida/Agent-Knowledge-Compiler-and-Control-Plane/actions) for workflow status.

---

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
