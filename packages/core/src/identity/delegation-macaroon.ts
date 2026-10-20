import crypto from "node:crypto";

export type MacaroonRiskLevel = "low" | "medium" | "high" | "critical";
export type MacaroonSideEffect = "read" | "write" | "submit";

export interface MacaroonCaveat {
  allowedTools?: string[];
  maxRiskLevel?: MacaroonRiskLevel;
  allowedSideEffects?: MacaroonSideEffect[];
  expiresAt?: string;
  maxTokensBudget?: number;
  delegateToAgentId?: string;
}

export interface DelegationMacaroon {
  version: "akcp-macaroon-v1";
  nonce: string;
  issuerAgentId: string;
  delegateAgentId: string;
  issuedAt: string;
  caveats: MacaroonCaveat[];
  signature: string;
}

export interface MintMacaroonOptions {
  issuerAgentId: string;
  delegateAgentId: string;
  initialCaveats?: MacaroonCaveat[];
  rootSecret?: string;
  nonce?: string;
  issuedAt?: string;
}

export interface MacaroonVerificationContext {
  toolName: string;
  riskLevel?: string;
  sideEffect: MacaroonSideEffect;
  agentId?: string;
  cumulativeTokensUsed?: number;
  now?: Date;
}

export interface MacaroonVerificationResult {
  valid: boolean;
  reason?: string;
  issuerAgentId?: string;
  effectiveDelegateAgentId?: string;
  caveatsEvaluated: number;
}

const RISK_RANK: Record<MacaroonRiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function canonicalizeCaveat(caveat: MacaroonCaveat): string {
  const ordered: Record<string, unknown> = {};
  if (caveat.allowedSideEffects !== undefined) {
    ordered.allowedSideEffects = [...caveat.allowedSideEffects];
  }
  if (caveat.allowedTools !== undefined) {
    ordered.allowedTools = [...caveat.allowedTools];
  }
  if (caveat.delegateToAgentId !== undefined) {
    ordered.delegateToAgentId = caveat.delegateToAgentId;
  }
  if (caveat.expiresAt !== undefined) {
    ordered.expiresAt = caveat.expiresAt;
  }
  if (caveat.maxRiskLevel !== undefined) {
    ordered.maxRiskLevel = caveat.maxRiskLevel;
  }
  if (caveat.maxTokensBudget !== undefined) {
    ordered.maxTokensBudget = caveat.maxTokensBudget;
  }
  return JSON.stringify(ordered);
}

function computeRootSignature(
  rootSecret: string,
  nonce: string,
  issuerAgentId: string,
  initialDelegateAgentId: string,
  issuedAt: string,
): string {
  const rootKey = crypto
    .createHash("sha256")
    .update(`akcp-macaroon-root:${rootSecret}`)
    .digest();
  const headerPayload = JSON.stringify({
    version: "akcp-macaroon-v1",
    nonce,
    issuerAgentId,
    initialDelegateAgentId,
    issuedAt,
  });
  return crypto
    .createHmac("sha256", rootKey)
    .update(headerPayload, "utf8")
    .digest("hex");
}

function chainCaveatSignature(
  previousSignatureHex: string,
  caveat: MacaroonCaveat,
): string {
  const keyBytes = Buffer.from(previousSignatureHex, "hex");
  return crypto
    .createHmac("sha256", keyBytes)
    .update(canonicalizeCaveat(caveat), "utf8")
    .digest("hex");
}

function matchesToolPattern(pattern: string, toolName: string): boolean {
  if (pattern === "*") return true;
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    return toolName.startsWith(prefix);
  }
  return pattern === toolName;
}

/**
 * Cryptographic Chained-HMAC Macaroon service for sub-agent capability delegation.
 * Holders of a macaroon can offline-attenuate it (append stricter caveats or sub-delegate)
 * without possessing the root secret, while removal or tampering of any caveat breaks
 * the chained HMAC signature.
 */
export class DelegationMacaroonService {
  private readonly defaultRootSecret: string;

  constructor(defaultRootSecret = "akcp-default-macaroon-root-secret") {
    this.defaultRootSecret = defaultRootSecret;
  }

  public mintRootMacaroon(options: MintMacaroonOptions): DelegationMacaroon {
    const secret = options.rootSecret ?? this.defaultRootSecret;
    const nonce = options.nonce ?? crypto.randomBytes(12).toString("hex");
    const issuedAt = options.issuedAt ?? new Date().toISOString();
    const initialCaveats = options.initialCaveats ?? [];

    // First caveat always binds the initial delegate so any future sub-delegation
    // chain preserves the cryptographic root header invariant.
    const rootCaveat: MacaroonCaveat = {
      delegateToAgentId: options.delegateAgentId,
    };
    const allCaveats = [rootCaveat, ...initialCaveats];

    let sig = computeRootSignature(
      secret,
      nonce,
      options.issuerAgentId,
      options.delegateAgentId,
      issuedAt,
    );

    let effectiveDelegate = options.delegateAgentId;
    for (const c of allCaveats) {
      sig = chainCaveatSignature(sig, c);
      if (c.delegateToAgentId) {
        effectiveDelegate = c.delegateToAgentId;
      }
    }

    return {
      version: "akcp-macaroon-v1",
      nonce,
      issuerAgentId: options.issuerAgentId,
      delegateAgentId: effectiveDelegate,
      issuedAt,
      caveats: allCaveats,
      signature: sig,
    };
  }

  /**
   * Appends a monotonic attenuation caveat to an existing macaroon without requiring the root secret.
   */
  public attenuateMacaroon(
    macaroonOrToken: DelegationMacaroon | string,
    caveat: MacaroonCaveat,
  ): DelegationMacaroon {
    const mac =
      typeof macaroonOrToken === "string"
        ? this.deserializeToken(macaroonOrToken)
        : macaroonOrToken;

    const nextSig = chainCaveatSignature(mac.signature, caveat);
    const nextDelegate = caveat.delegateToAgentId ?? mac.delegateAgentId;

    return {
      ...mac,
      delegateAgentId: nextDelegate,
      caveats: [...mac.caveats, caveat],
      signature: nextSig,
    };
  }

  public serializeToken(macaroon: DelegationMacaroon): string {
    const encoded = Buffer.from(JSON.stringify(macaroon), "utf8").toString(
      "base64url",
    );
    return `akcp_mac_${encoded}`;
  }

  public deserializeToken(token: string): DelegationMacaroon {
    const raw = token.startsWith("akcp_mac_")
      ? token.slice("akcp_mac_".length)
      : token;
    const jsonStr = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(jsonStr) as DelegationMacaroon;
    if (
      parsed.version !== "akcp-macaroon-v1" ||
      typeof parsed.signature !== "string" ||
      !Array.isArray(parsed.caveats)
    ) {
      throw new Error("Malformed AKCP delegation macaroon token.");
    }
    return parsed;
  }

  public verifyAndAuthorize(
    macaroonOrToken: DelegationMacaroon | string,
    context: MacaroonVerificationContext,
    rootSecretOverride?: string,
  ): MacaroonVerificationResult {
    let mac: DelegationMacaroon;
    try {
      mac =
        typeof macaroonOrToken === "string"
          ? this.deserializeToken(macaroonOrToken)
          : macaroonOrToken;
    } catch (err) {
      return {
        valid: false,
        reason: `Failed to parse delegation token: ${(err as Error).message}`,
        caveatsEvaluated: 0,
      };
    }

    if (mac.caveats.length === 0 || !mac.caveats[0]?.delegateToAgentId) {
      return {
        valid: false,
        reason: "Missing root delegation binding caveat.",
        caveatsEvaluated: 0,
      };
    }

    const initialDelegate = mac.caveats[0].delegateToAgentId;
    const secret = rootSecretOverride ?? this.defaultRootSecret;

    let expectedSig = computeRootSignature(
      secret,
      mac.nonce,
      mac.issuerAgentId,
      initialDelegate,
      mac.issuedAt,
    );

    let effectiveDelegate = initialDelegate;
    for (const c of mac.caveats) {
      expectedSig = chainCaveatSignature(expectedSig, c);
      if (c.delegateToAgentId) {
        effectiveDelegate = c.delegateToAgentId;
      }
    }

    const actualBuf = Buffer.from(mac.signature, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (
      actualBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(actualBuf, expectedBuf)
    ) {
      return {
        valid: false,
        reason:
          "Macaroon cryptographic HMAC chain verification failed (tampered caveat or invalid root key).",
        caveatsEvaluated: 0,
      };
    }

    if (mac.delegateAgentId !== effectiveDelegate) {
      return {
        valid: false,
        reason: `Delegate agent mismatch: header declares '${mac.delegateAgentId}' but signed caveat chain binds '${effectiveDelegate}'.`,
        caveatsEvaluated: 0,
      };
    }

    if (
      context.agentId &&
      context.agentId !== "anonymous" &&
      context.agentId !== effectiveDelegate
    ) {
      return {
        valid: false,
        reason: `Macaroon is delegated to '${effectiveDelegate}', not caller '${context.agentId}'.`,
        issuerAgentId: mac.issuerAgentId,
        effectiveDelegateAgentId: effectiveDelegate,
        caveatsEvaluated: 0,
      };
    }

    const nowMs = (context.now ?? new Date()).getTime();
    const reqRisk = (context.riskLevel ?? "medium") as MacaroonRiskLevel;
    const reqRiskRank = RISK_RANK[reqRisk] ?? 1;

    for (let i = 0; i < mac.caveats.length; i++) {
      const c = mac.caveats[i]!;

      if (c.allowedTools && c.allowedTools.length > 0) {
        const matched = c.allowedTools.some((pattern) =>
          matchesToolPattern(pattern, context.toolName),
        );
        if (!matched) {
          return {
            valid: false,
            reason: `Caveat #${i} restricts tools to [${c.allowedTools.join(", ")}]; denied '${context.toolName}'.`,
            issuerAgentId: mac.issuerAgentId,
            effectiveDelegateAgentId: effectiveDelegate,
            caveatsEvaluated: i + 1,
          };
        }
      }

      if (c.maxRiskLevel) {
        const maxRank = RISK_RANK[c.maxRiskLevel];
        if (reqRiskRank > maxRank) {
          return {
            valid: false,
            reason: `Caveat #${i} restricts maxRiskLevel to '${c.maxRiskLevel}'; tool risk is '${reqRisk}'.`,
            issuerAgentId: mac.issuerAgentId,
            effectiveDelegateAgentId: effectiveDelegate,
            caveatsEvaluated: i + 1,
          };
        }
      }

      if (c.allowedSideEffects && c.allowedSideEffects.length > 0) {
        if (!c.allowedSideEffects.includes(context.sideEffect)) {
          return {
            valid: false,
            reason: `Caveat #${i} restricts sideEffects to [${c.allowedSideEffects.join(", ")}]; denied '${context.sideEffect}'.`,
            issuerAgentId: mac.issuerAgentId,
            effectiveDelegateAgentId: effectiveDelegate,
            caveatsEvaluated: i + 1,
          };
        }
      }

      if (c.expiresAt) {
        const expMs = Date.parse(c.expiresAt);
        if (Number.isNaN(expMs) || nowMs > expMs) {
          return {
            valid: false,
            reason: `Caveat #${i} expired at '${c.expiresAt}'.`,
            issuerAgentId: mac.issuerAgentId,
            effectiveDelegateAgentId: effectiveDelegate,
            caveatsEvaluated: i + 1,
          };
        }
      }

      if (
        c.maxTokensBudget !== undefined &&
        context.cumulativeTokensUsed !== undefined
      ) {
        if (context.cumulativeTokensUsed > c.maxTokensBudget) {
          return {
            valid: false,
            reason: `Caveat #${i} restricts cumulative token budget to ${c.maxTokensBudget} (used: ${context.cumulativeTokensUsed}).`,
            issuerAgentId: mac.issuerAgentId,
            effectiveDelegateAgentId: effectiveDelegate,
            caveatsEvaluated: i + 1,
          };
        }
      }
    }

    return {
      valid: true,
      issuerAgentId: mac.issuerAgentId,
      effectiveDelegateAgentId: effectiveDelegate,
      caveatsEvaluated: mac.caveats.length,
    };
  }
}
