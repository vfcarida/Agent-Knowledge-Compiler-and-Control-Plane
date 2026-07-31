import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { BuildManifest } from "./types.js";

/**
 * Provenance signing scaffolding — SLSA/in-toto-shaped, but locally verifiable only.
 *
 * This module intentionally does NOT implement real Sigstore/cosign keyless signing:
 * that requires a CI OIDC identity (GitHub Actions `id-token: write` -> Fulcio ->
 * Rekor transparency log) which can't be exercised in a local/offline environment.
 * What's here is a real, working Ed25519 sign/verify pair using only Node's built-in
 * `crypto` (no new dependency) so the *shape* of the attestation (in-toto ITE-6
 * Statement) and the verify logic can be built and tested locally. Wiring actual
 * Sigstore signing into `.github/workflows/release.yml` (with `cosign sign-blob
 * --bundle`) is a follow-up that belongs in CI, not here — see the comment at the
 * bottom of this file for what that step would look like.
 *
 * Reference: in-toto Attestation Framework — https://in-toto.io/attestation
 */

export interface ProvenanceAttestation {
  _type: "https://in-toto.io/Statement/v1";
  subject: Array<{ name: string; digest: { sha256: string } }>;
  predicateType: "https://akcp.dev/attestations/build-manifest/v1";
  predicate: BuildManifest;
}

export interface SignedAttestation {
  attestation: ProvenanceAttestation;
  signatures: Array<{ keyid: string; sig: string }>;
}

/** Wraps a BuildManifest as an in-toto ITE-6 Statement, one subject per hashed target. */
export function buildAttestation(
  manifest: BuildManifest,
): ProvenanceAttestation {
  return {
    _type: "https://in-toto.io/Statement/v1",
    subject: manifest.targets
      .filter(
        (t): t is typeof t & { hash: string } => typeof t.hash === "string",
      )
      .map((t) => ({
        name: t.outputs[0] ?? t.name,
        digest: { sha256: t.hash },
      })),
    predicateType: "https://akcp.dev/attestations/build-manifest/v1",
    predicate: manifest,
  };
}

/** Local-dev key generation only. Real deployments should use CI-managed keys or Sigstore keyless signing. */
export function generateSigningKeyPair(): {
  privateKeyPem: string;
  publicKeyPem: string;
} {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519", {
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  return {
    privateKeyPem: privateKey as unknown as string,
    publicKeyPem: publicKey as unknown as string,
  };
}

function keyIdFor(publicKeyPem: string): string {
  const publicKey = crypto.createPublicKey(publicKeyPem);
  const der = publicKey.export({ type: "spki", format: "der" });
  return crypto.createHash("sha256").update(der).digest("hex").slice(0, 16);
}

export function signAttestation(
  attestation: ProvenanceAttestation,
  privateKeyPem: string,
): SignedAttestation {
  const payload = Buffer.from(JSON.stringify(attestation));
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const publicKeyPem = crypto
    .createPublicKey(privateKey)
    .export({ type: "spki", format: "pem" }) as string;
  // Ed25519 signs the raw message directly; no digest algorithm is passed to crypto.sign.
  const signature = crypto.sign(null, payload, privateKey);
  return {
    attestation,
    signatures: [
      { keyid: keyIdFor(publicKeyPem), sig: signature.toString("base64") },
    ],
  };
}

export function verifyAttestationSignature(
  signed: SignedAttestation,
  publicKeyPem: string,
): boolean {
  const expectedKeyId = keyIdFor(publicKeyPem);
  const matching = signed.signatures.find((s) => s.keyid === expectedKeyId);
  if (!matching) return false;

  const payload = Buffer.from(JSON.stringify(signed.attestation));
  const publicKey = crypto.createPublicKey(publicKeyPem);
  return crypto.verify(
    null,
    payload,
    publicKey,
    Buffer.from(matching.sig, "base64"),
  );
}

/**
 * Builds, signs, and writes an attestation next to the manifest at
 * `<manifestPath minus .json>.attestation.json`. Opt-in — callers decide whether
 * to invoke this after `ProvenanceManifestBuilder.writeManifest()`.
 */
export async function writeSignedAttestation(
  manifest: BuildManifest,
  manifestPath: string,
  privateKeyPem: string,
): Promise<string> {
  const attestation = buildAttestation(manifest);
  const signed = signAttestation(attestation, privateKeyPem);
  const outPath = manifestPath.replace(/\.json$/, "") + ".attestation.json";
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(signed, null, 2), "utf-8");
  return outPath;
}

export async function readAndVerifyAttestation(
  attestationPath: string,
  publicKeyPem: string,
): Promise<{ valid: boolean; attestation?: ProvenanceAttestation }> {
  const raw = await fs.readFile(attestationPath, "utf-8");
  const signed = JSON.parse(raw) as SignedAttestation;
  const valid = verifyAttestationSignature(signed, publicKeyPem);
  return { valid, attestation: valid ? signed.attestation : undefined };
}

/**
 * CI-only real signing (NOT implemented here — sketch for release.yml):
 *
 *   - name: Sign provenance with Sigstore
 *     permissions: { id-token: write }
 *     run: cosign sign-blob --yes --bundle dist/akcp-manifest.sigstore.json dist/akcp-manifest.json
 *
 * That produces a Fulcio-issued short-lived cert + Rekor transparency-log entry —
 * verifiable with `cosign verify-blob-attestation`, and NOT equivalent to (or
 * replaceable by) the local Ed25519 fallback above.
 */
