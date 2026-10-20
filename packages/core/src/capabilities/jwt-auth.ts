import crypto from "node:crypto";

export interface JwtAuthConfig {
  /** Shared HMAC secret for HS256 tokens */
  secret?: string;
  /** PEM-encoded public key for EdDSA or RS256 tokens */
  publicKeyPem?: string;
  /** Expected issuer ('iss' claim) */
  issuer?: string;
  /** Expected audience ('aud' claim) */
  audience?: string;
  /** Clock skew tolerance in seconds (default: 5) */
  clockToleranceSeconds?: number;
}

export interface JwtVerifyResult {
  valid: boolean;
  agentId?: string;
  scopes?: string[];
  roles?: string[];
  claims?: Record<string, unknown>;
  reason?: string;
}

function base64UrlDecodeToBuffer(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + "=".repeat(padLen), "base64");
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Signs a JWT payload using HS256 or EdDSA (Ed25519) for local testing or token issuance.
 */
export function signJwtToken(
  payload: Record<string, unknown>,
  options: {
    secret?: string;
    privateKeyPem?: string;
    algorithm?: "HS256" | "EdDSA";
  },
): string {
  const alg = options.algorithm ?? (options.privateKeyPem ? "EdDSA" : "HS256");
  const header = { alg, typ: "JWT" };
  const encodedHeader = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  if (alg === "HS256") {
    if (!options.secret) {
      throw new Error("HS256 signing requires a secret");
    }
    const sig = crypto
      .createHmac("sha256", options.secret)
      .update(signingInput)
      .digest();
    return `${signingInput}.${base64UrlEncode(sig)}`;
  }

  if (alg === "EdDSA") {
    if (!options.privateKeyPem) {
      throw new Error("EdDSA signing requires a privateKeyPem");
    }
    const privateKey = crypto.createPrivateKey(options.privateKeyPem);
    const sig = crypto.sign(null, Buffer.from(signingInput), privateKey);
    return `${signingInput}.${base64UrlEncode(sig)}`;
  }

  throw new Error(`Unsupported JWT signing algorithm: ${String(alg)}`);
}

/**
 * Verifies a JWT token (HS256, EdDSA, RS256) and extracts agent identity, scopes, and roles.
 */
export function verifyJwtToken(
  rawToken: string,
  config: JwtAuthConfig,
): JwtVerifyResult {
  const token = rawToken.startsWith("Bearer ")
    ? rawToken.slice(7).trim()
    : rawToken.trim();

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "Malformed JWT structure" };
  }

  const [headerPart, payloadPart, signaturePart] = parts as [
    string,
    string,
    string,
  ];

  let header: { alg?: string; typ?: string };
  let claims: Record<string, unknown>;

  try {
    header = JSON.parse(
      base64UrlDecodeToBuffer(headerPart).toString("utf-8"),
    ) as { alg?: string; typ?: string };
    claims = JSON.parse(
      base64UrlDecodeToBuffer(payloadPart).toString("utf-8"),
    ) as Record<string, unknown>;
  } catch {
    return { valid: false, reason: "Invalid JSON in JWT header or payload" };
  }

  const signingInput = `${headerPart}.${payloadPart}`;
  const signatureBuf = base64UrlDecodeToBuffer(signaturePart);

  // 1. Cryptographic signature verification
  if (header.alg === "HS256") {
    if (!config.secret) {
      return {
        valid: false,
        reason: "JWT uses HS256 but no HMAC secret is configured",
      };
    }
    const expectedSig = crypto
      .createHmac("sha256", config.secret)
      .update(signingInput)
      .digest();
    if (
      expectedSig.length !== signatureBuf.length ||
      !crypto.timingSafeEqual(expectedSig, signatureBuf)
    ) {
      return { valid: false, reason: "Invalid JWT HMAC signature" };
    }
  } else if (header.alg === "EdDSA") {
    if (!config.publicKeyPem) {
      return {
        valid: false,
        reason: "JWT uses EdDSA but no publicKeyPem is configured",
      };
    }
    try {
      const pubKey = crypto.createPublicKey(config.publicKeyPem);
      const ok = crypto.verify(
        null,
        Buffer.from(signingInput),
        pubKey,
        signatureBuf,
      );
      if (!ok) {
        return { valid: false, reason: "Invalid JWT EdDSA signature" };
      }
    } catch (err: unknown) {
      return {
        valid: false,
        reason: `EdDSA verification error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  } else if (header.alg === "RS256") {
    if (!config.publicKeyPem) {
      return {
        valid: false,
        reason: "JWT uses RS256 but no publicKeyPem is configured",
      };
    }
    try {
      const pubKey = crypto.createPublicKey(config.publicKeyPem);
      const ok = crypto.verify(
        "RSA-SHA256",
        Buffer.from(signingInput),
        pubKey,
        signatureBuf,
      );
      if (!ok) {
        return { valid: false, reason: "Invalid JWT RS256 signature" };
      }
    } catch (err: unknown) {
      return {
        valid: false,
        reason: `RS256 verification error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  } else {
    return {
      valid: false,
      reason: `Unsupported or insecure JWT algorithm: ${String(header.alg)}`,
    };
  }

  // 2. Temporal & issuer/audience claims validation
  const nowSec = Math.floor(Date.now() / 1000);
  const skew = config.clockToleranceSeconds ?? 5;

  if (typeof claims.exp === "number" && nowSec - skew >= claims.exp) {
    return { valid: false, reason: "JWT has expired (exp)" };
  }

  if (typeof claims.nbf === "number" && nowSec + skew < claims.nbf) {
    return { valid: false, reason: "JWT is not yet valid (nbf)" };
  }

  if (config.issuer && claims.iss !== config.issuer) {
    return {
      valid: false,
      reason: `JWT issuer mismatch: expected '${config.issuer}', got '${String(claims.iss)}'`,
    };
  }

  if (config.audience) {
    const aud = claims.aud;
    const matchesAud =
      aud === config.audience ||
      (Array.isArray(aud) && aud.includes(config.audience));
    if (!matchesAud) {
      return {
        valid: false,
        reason: `JWT audience mismatch: expected '${config.audience}'`,
      };
    }
  }

  // 3. Extract agentId, scopes, and roles
  const agentId =
    (typeof claims.sub === "string" && claims.sub) ||
    (typeof claims.agent_id === "string" && claims.agent_id) ||
    (typeof claims.client_id === "string" && claims.client_id) ||
    "jwt-authenticated-agent";

  const scopes: string[] = [];
  if (typeof claims.scope === "string") {
    scopes.push(...claims.scope.split(/\s+/).filter(Boolean));
  }
  if (Array.isArray(claims.scopes)) {
    for (const s of claims.scopes) {
      if (typeof s === "string") scopes.push(s);
    }
  }
  if (Array.isArray(claims.scp)) {
    for (const s of claims.scp) {
      if (typeof s === "string") scopes.push(s);
    }
  }

  const roles: string[] = [];
  if (Array.isArray(claims.roles)) {
    for (const r of claims.roles) {
      if (typeof r === "string") roles.push(r);
    }
  }

  return {
    valid: true,
    agentId,
    scopes: scopes.length > 0 ? Array.from(new Set(scopes)) : undefined,
    roles: roles.length > 0 ? Array.from(new Set(roles)) : undefined,
    claims,
  };
}
