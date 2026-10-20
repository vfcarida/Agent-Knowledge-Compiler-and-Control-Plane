import crypto from "node:crypto";

export type VaultPiiClass = "email" | "ssn" | "phone" | "api_key";

export interface EncryptedVaultEntry {
  token: string;
  piiClass: VaultPiiClass;
  ivHex: string;
  authTagHex: string;
  ciphertextHex: string;
  createdAt: string;
}

export interface TokenizeTextResult {
  tokenizedText: string;
  tokensCreated: string[];
  count: number;
}

export interface DetokenizeTextResult {
  detokenizedText: string;
  detokenizedCount: number;
}

const PII_PATTERNS: Array<{ piiClass: VaultPiiClass; regex: RegExp }> = [
  {
    piiClass: "email",
    regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
  },
  {
    piiClass: "ssn",
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
  },
  {
    piiClass: "api_key",
    regex: /\b(?:sk-[a-zA-Z0-9]{16,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{20,})\b/g,
  },
  {
    piiClass: "phone",
    regex: /\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g,
  },
];

/**
 * Deterministic Format-Preserving PII Token Vault using HMAC-SHA256 pseudonymization
 * and AES-256-GCM authenticated encryption in rest.
 * Allows LLMs to reason over consistent pseudonymous tokens while permitting
 * governed detokenization at authorized tool boundaries.
 */
export class PiiTokenVault {
  private readonly encryptionKey: Buffer;
  private readonly hmacKey: Buffer;
  private readonly entries = new Map<string, EncryptedVaultEntry>();

  constructor(vaultSecret: string = "akcp-default-vault-secret-2026") {
    this.encryptionKey = crypto
      .createHash("sha256")
      .update(`enc:${vaultSecret}`, "utf8")
      .digest();
    this.hmacKey = crypto
      .createHash("sha256")
      .update(`hmac:${vaultSecret}`, "utf8")
      .digest();
  }

  private computeDeterministicToken(
    plaintext: string,
    piiClass: VaultPiiClass,
  ): string {
    const hmacHex = crypto
      .createHmac("sha256", this.hmacKey)
      .update(`${piiClass}:${plaintext}`, "utf8")
      .digest("hex")
      .slice(0, 12);

    if (piiClass === "email") {
      return `tkn_${hmacHex}@vault.akcp.local`;
    }
    return `tkn_${piiClass}_${hmacHex}`;
  }

  private storeEncrypted(plaintext: string, piiClass: VaultPiiClass): string {
    const token = this.computeDeterministicToken(plaintext, piiClass);
    if (this.entries.has(token)) {
      return token;
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    cipher.setAAD(Buffer.from(`${token}:${piiClass}`, "utf8"));
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    this.entries.set(token, {
      token,
      piiClass,
      ivHex: iv.toString("hex"),
      authTagHex: authTag.toString("hex"),
      ciphertextHex: encrypted.toString("hex"),
      createdAt: new Date().toISOString(),
    });
    return token;
  }

  private decryptToken(entry: EncryptedVaultEntry): string {
    const iv = Buffer.from(entry.ivHex, "hex");
    const authTag = Buffer.from(entry.authTagHex, "hex");
    const ciphertext = Buffer.from(entry.ciphertextHex, "hex");

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey,
      iv,
    );
    decipher.setAAD(Buffer.from(`${entry.token}:${entry.piiClass}`, "utf8"));
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }

  public tokenizeText(text: string): TokenizeTextResult {
    let working = text;
    const tokensCreated: string[] = [];

    for (const { piiClass, regex } of PII_PATTERNS) {
      working = working.replace(regex, (match) => {
        // Do not re-tokenize an already generated vault token
        if (
          match.startsWith("tkn_") &&
          (match.endsWith("@vault.akcp.local") || this.entries.has(match))
        ) {
          return match;
        }
        const token = this.storeEncrypted(match, piiClass);
        tokensCreated.push(token);
        return token;
      });
    }

    return {
      tokenizedText: working,
      tokensCreated,
      count: tokensCreated.length,
    };
  }

  public detokenizeText(
    text: string,
    options?: { allowedPiiClasses?: VaultPiiClass[] },
  ): DetokenizeTextResult {
    let working = text;
    let detokenizedCount = 0;
    const allowedSet = options?.allowedPiiClasses
      ? new Set(options.allowedPiiClasses)
      : null;

    for (const [token, entry] of this.entries.entries()) {
      if (allowedSet && !allowedSet.has(entry.piiClass)) {
        continue;
      }
      if (working.includes(token)) {
        const original = this.decryptToken(entry);
        working = working.split(token).join(original);
        detokenizedCount++;
      }
    }

    return {
      detokenizedText: working,
      detokenizedCount,
    };
  }

  public tokenizePayload<T>(payload: T): {
    tokenizedPayload: T;
    tokensCreated: string[];
  } {
    const tokensCreated: string[] = [];

    const walk = (val: unknown): unknown => {
      if (typeof val === "string") {
        const res = this.tokenizeText(val);
        tokensCreated.push(...res.tokensCreated);
        return res.tokenizedText;
      }
      if (Array.isArray(val)) {
        return val.map((item) => walk(item));
      }
      if (val !== null && typeof val === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
          out[k] = walk(v);
        }
        return out;
      }
      return val;
    };

    return {
      tokenizedPayload: walk(payload) as T,
      tokensCreated,
    };
  }

  public detokenizePayload<T>(
    payload: T,
    options?: { allowedPiiClasses?: VaultPiiClass[] },
  ): {
    detokenizedPayload: T;
    detokenizedCount: number;
  } {
    let totalDetokenized = 0;

    const walk = (val: unknown): unknown => {
      if (typeof val === "string") {
        const res = this.detokenizeText(val, options);
        totalDetokenized += res.detokenizedCount;
        return res.detokenizedText;
      }
      if (Array.isArray(val)) {
        return val.map((item) => walk(item));
      }
      if (val !== null && typeof val === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
          out[k] = walk(v);
        }
        return out;
      }
      return val;
    };

    return {
      detokenizedPayload: walk(payload) as T,
      detokenizedCount: totalDetokenized,
    };
  }

  public getVaultSize(): number {
    return this.entries.size;
  }
}
