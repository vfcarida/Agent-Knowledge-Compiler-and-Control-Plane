import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  generateSigningKeyPair,
  signAttestation,
  verifyAttestationSignature,
  type ProvenanceAttestation,
  type SignedAttestation,
} from "./sign.js";

export interface WrappedKeyEnvelope {
  algorithm: "aes-256-gcm";
  kdf: "scrypt";
  saltHex: string;
  ivHex: string;
  authTagHex: string;
  ciphertextHex: string;
  keyId: string;
}

export type KeyStatus = "active" | "retired" | "revoked";

export interface KeyringEntry {
  keyId: string;
  publicKeyPem: string;
  wrappedPrivateKey?: WrappedKeyEnvelope;
  status: KeyStatus;
  createdAt: string;
  rotatedAt?: string;
  revokedAt?: string;
}

export interface KeyringManifest {
  schemaVersion: "akcp.keyring/v1";
  activeKeyId: string | null;
  keys: KeyringEntry[];
}

export interface KeyringVerificationResult {
  valid: boolean;
  keyId?: string;
  keyStatus?: KeyStatus;
  reason?: string;
}

export function computeKeyId(publicKeyPem: string): string {
  const pubKey = crypto.createPublicKey(publicKeyPem);
  const der = pubKey.export({ type: "spki", format: "der" });
  return crypto.createHash("sha256").update(der).digest("hex").slice(0, 16);
}

/**
 * Wraps an Ed25519 PKCS#8 PEM private key using AES-256-GCM authenticated encryption
 * with a key-encryption key (KEK) derived via scrypt.
 */
export function wrapPrivateKeyPem(
  privateKeyPem: string,
  kekPassphrase: string,
  keyId: string,
): WrappedKeyEnvelope {
  if (!kekPassphrase || kekPassphrase.length < 4) {
    throw new Error(
      "KMS KEK passphrase must be at least 4 characters long for envelope encryption.",
    );
  }
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const derivedKek = crypto.scryptSync(kekPassphrase, salt, 32);

  const cipher = crypto.createCipheriv("aes-256-gcm", derivedKek, iv);
  cipher.setAAD(Buffer.from(keyId, "utf8"));
  const encrypted = Buffer.concat([
    cipher.update(privateKeyPem, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm: "aes-256-gcm",
    kdf: "scrypt",
    saltHex: salt.toString("hex"),
    ivHex: iv.toString("hex"),
    authTagHex: authTag.toString("hex"),
    ciphertextHex: encrypted.toString("hex"),
    keyId,
  };
}

/**
 * Unwraps an AES-256-GCM wrapped private key envelope using the provided KEK passphrase.
 */
export function unwrapPrivateKeyPem(
  envelope: WrappedKeyEnvelope,
  kekPassphrase: string,
): string {
  const salt = Buffer.from(envelope.saltHex, "hex");
  const iv = Buffer.from(envelope.ivHex, "hex");
  const authTag = Buffer.from(envelope.authTagHex, "hex");
  const ciphertext = Buffer.from(envelope.ciphertextHex, "hex");

  const derivedKek = crypto.scryptSync(kekPassphrase, salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKek, iv);
  decipher.setAAD(Buffer.from(envelope.keyId, "utf8"));
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export class KmsEnvelopeKeyring {
  private manifest: KeyringManifest;

  constructor(initialManifest?: KeyringManifest) {
    this.manifest = initialManifest ?? {
      schemaVersion: "akcp.keyring/v1",
      activeKeyId: null,
      keys: [],
    };
  }

  public static loadFromFile(filePath: string): KmsEnvelopeKeyring {
    if (!fs.existsSync(filePath)) {
      return new KmsEnvelopeKeyring();
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as KeyringManifest;
    return new KmsEnvelopeKeyring(parsed);
  }

  public saveToFile(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      filePath,
      JSON.stringify(this.manifest, null, 2) + "\n",
      "utf-8",
    );
  }

  public getManifest(): KeyringManifest {
    return this.manifest;
  }

  public generateKey(
    kekPassphrase: string,
    makeActive: boolean = true,
  ): KeyringEntry {
    const { privateKeyPem, publicKeyPem } = generateSigningKeyPair();
    const keyId = computeKeyId(publicKeyPem);
    const wrappedPrivateKey = wrapPrivateKeyPem(
      privateKeyPem,
      kekPassphrase,
      keyId,
    );

    if (makeActive && this.manifest.activeKeyId) {
      const prevActive = this.manifest.keys.find(
        (k) => k.keyId === this.manifest.activeKeyId,
      );
      if (prevActive && prevActive.status === "active") {
        prevActive.status = "retired";
        prevActive.rotatedAt = new Date().toISOString();
      }
    }

    const entry: KeyringEntry = {
      keyId,
      publicKeyPem,
      wrappedPrivateKey,
      status: makeActive ? "active" : "retired",
      createdAt: new Date().toISOString(),
    };

    this.manifest.keys.push(entry);
    if (makeActive) {
      this.manifest.activeKeyId = keyId;
    }

    return entry;
  }

  public rotateKey(kekPassphrase: string): KeyringEntry {
    return this.generateKey(kekPassphrase, true);
  }

  public revokeKey(keyId: string): KeyringEntry {
    const target = this.manifest.keys.find((k) => k.keyId === keyId);
    if (!target) {
      throw new Error(`Key ID '${keyId}' not found in keyring.`);
    }
    target.status = "revoked";
    target.revokedAt = new Date().toISOString();

    if (this.manifest.activeKeyId === keyId) {
      const fallback = this.manifest.keys.find((k) => k.status === "active");
      this.manifest.activeKeyId = fallback ? fallback.keyId : null;
    }
    return target;
  }

  public signWithActiveKey(
    attestation: ProvenanceAttestation,
    kekPassphrase: string,
  ): SignedAttestation {
    if (!this.manifest.activeKeyId) {
      throw new Error("No active signing key in KMS keyring.");
    }
    const activeEntry = this.manifest.keys.find(
      (k) => k.keyId === this.manifest.activeKeyId,
    );
    if (!activeEntry || activeEntry.status !== "active") {
      throw new Error(
        `Active key '${this.manifest.activeKeyId}' is missing or not active.`,
      );
    }
    if (!activeEntry.wrappedPrivateKey) {
      throw new Error(
        `Active key '${activeEntry.keyId}' does not contain a wrapped private key envelope.`,
      );
    }

    const privateKeyPem = unwrapPrivateKeyPem(
      activeEntry.wrappedPrivateKey,
      kekPassphrase,
    );
    return signAttestation(attestation, privateKeyPem);
  }

  public verifyWithKeyring(
    signed: SignedAttestation,
  ): KeyringVerificationResult {
    for (const sig of signed.signatures) {
      const entry = this.manifest.keys.find((k) => k.keyId === sig.keyid);
      if (!entry) {
        continue;
      }
      if (entry.status === "revoked") {
        return {
          valid: false,
          keyId: entry.keyId,
          keyStatus: "revoked",
          reason: `Signing key '${entry.keyId}' has been revoked at ${entry.revokedAt ?? "unknown"}.`,
        };
      }
      const sigOk = verifyAttestationSignature(signed, entry.publicKeyPem);
      if (sigOk) {
        return {
          valid: true,
          keyId: entry.keyId,
          keyStatus: entry.status,
        };
      }
      return {
        valid: false,
        keyId: entry.keyId,
        keyStatus: entry.status,
        reason: `Cryptographic signature verification failed for key '${entry.keyId}'.`,
      };
    }

    return {
      valid: false,
      reason: "No matching keyId found in KMS keyring for the attestation.",
    };
  }
}
