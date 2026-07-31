# Artifact Manifest

The artifact manifest (`akcp-manifest.json`) is the compiler's own record of a
single compile run: which targets it wrote, their content hashes, and any
diagnostics/conformance info from that run. It is produced by
`ProvenanceManifestBuilder` (`packages/core/src/provenance/build-manifest.ts`)
and consumed by `verifyManifest()` (`packages/core/src/provenance/verify.ts`),
which re-hashes each output on disk and reports tampered/missing files.

This is a **different layer** from the release-pipeline supply-chain controls
described in [docs/security/supply-chain.md](../security/supply-chain.md)
(GitHub Artifact Attestations, npm `--provenance`, SBOM attestation) — those
attest the _published npm packages_ built in CI; the artifact manifest here
attests the _output of a single `akcp compile` run_ against a knowledge
bundle, which may happen anywhere (a laptop, a CI job, a scheduled rebuild).

## Schema

```jsonc
{
  "schemaVersion": "akcp.artifact-manifest/v1",
  "buildId": "bld_...",
  "createdAt": "2026-07-08T00:00:00Z",
  "source": { "root": ".", "config": "akcp.yaml", "hash": "sha256..." },
  "compiler": { "name": "akcp", "version": "0.1.0" },
  "targets": [
    {
      "name": "ir-json",
      "status": "success",
      "outputs": ["dist/ir.json"],
      "hash": "sha256...",
      "sizeBytes": 1234,
    },
  ],
  "diagnostics": [],
  "conformance": { "level": "none", "checks": [] },
}
```

## Integrity vs. authenticity

`verifyManifest()` on its own is **tamper-evident, not tamper-proof**: it
re-hashes files and compares against the manifest, so it detects accidental
drift, but an attacker able to rewrite an output artifact can just as easily
regenerate the manifest to match. Cryptographic signing closes that gap.

### Local signing scaffold (`packages/core/src/provenance/sign.ts`)

- Wraps a `BuildManifest` as an [in-toto ITE-6 Statement](https://in-toto.io/attestation) (`buildAttestation`).
- Signs it with Ed25519 using only Node's built-in `crypto` — no new dependency
  (`signAttestation` / `verifyAttestationSignature`).
- `writeSignedAttestation()` / `readAndVerifyAttestation()` persist and verify
  the signed attestation as `<manifest>.attestation.json`.

This is real and locally testable (see
`packages/core/src/__tests__/provenance/sign.test.ts`), but it is **not**
Sigstore/cosign keyless signing — that requires a CI OIDC identity (GitHub
Actions `id-token: write` → Fulcio → Rekor transparency log) and can't be
exercised offline. The local Ed25519 path is meant for verifying the
attestation _shape_ and the verify logic; a real deployment wiring signing
into CI should use `cosign sign-blob` against the manifest instead (or in
addition), analogous to the release-pipeline attestations in
[docs/security/supply-chain.md](../security/supply-chain.md).
