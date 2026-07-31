import { describe, it, expect } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import {
  buildAttestation,
  generateSigningKeyPair,
  signAttestation,
  verifyAttestationSignature,
  writeSignedAttestation,
  readAndVerifyAttestation,
} from "../../provenance/sign.js";
import type { BuildManifest } from "../../provenance/types.js";

function sampleManifest(): BuildManifest {
  return {
    schemaVersion: "akcp.artifact-manifest/v1",
    buildId: "bld_test123",
    createdAt: "2026-07-08T00:00:00Z",
    source: { root: ".", config: "akcp.yaml", hash: "abc123" },
    compiler: { name: "akcp", version: "0.1.0" },
    targets: [
      {
        name: "ir-json",
        status: "success",
        outputs: ["dist/ir.json"],
        hash: "deadbeef",
      },
    ],
    diagnostics: [],
    conformance: { level: "none", checks: [] },
  };
}

describe("provenance signing (local Ed25519 scaffold)", () => {
  it("builds an in-toto-shaped attestation with one subject per hashed target", () => {
    const attestation = buildAttestation(sampleManifest());
    expect(attestation._type).toBe("https://in-toto.io/Statement/v1");
    expect(attestation.subject).toEqual([
      { name: "dist/ir.json", digest: { sha256: "deadbeef" } },
    ]);
  });

  it("signs and verifies successfully with the matching key pair", () => {
    const { privateKeyPem, publicKeyPem } = generateSigningKeyPair();
    const attestation = buildAttestation(sampleManifest());
    const signed = signAttestation(attestation, privateKeyPem);

    expect(verifyAttestationSignature(signed, publicKeyPem)).toBe(true);
  });

  it("fails verification with a different key pair", () => {
    const { privateKeyPem } = generateSigningKeyPair();
    const { publicKeyPem: wrongPublicKey } = generateSigningKeyPair();
    const attestation = buildAttestation(sampleManifest());
    const signed = signAttestation(attestation, privateKeyPem);

    expect(verifyAttestationSignature(signed, wrongPublicKey)).toBe(false);
  });

  it("fails verification if the attestation payload is tampered with", () => {
    const { privateKeyPem, publicKeyPem } = generateSigningKeyPair();
    const attestation = buildAttestation(sampleManifest());
    const signed = signAttestation(attestation, privateKeyPem);

    signed.attestation.predicate.buildId = "bld_tampered";

    expect(verifyAttestationSignature(signed, publicKeyPem)).toBe(false);
  });

  it("writeSignedAttestation + readAndVerifyAttestation round-trips through disk", async () => {
    const { privateKeyPem, publicKeyPem } = generateSigningKeyPair();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "akcp-sign-test-"));
    const manifestPath = path.join(tmpDir, "akcp-manifest.json");

    const attestationPath = await writeSignedAttestation(
      sampleManifest(),
      manifestPath,
      privateKeyPem,
    );

    const { valid, attestation } = await readAndVerifyAttestation(
      attestationPath,
      publicKeyPem,
    );

    expect(valid).toBe(true);
    expect(attestation?.predicate.buildId).toBe("bld_test123");

    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
