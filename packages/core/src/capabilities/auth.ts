import crypto from "crypto";
import { TokenBucketRateLimiter } from "./rate-limiter.js";

export interface AgentCredential {
  agentId: string;
  apiKey: string;        // hashed (SHA-256)
  scopes?: string[];     // optional: restrict to specific tools
  createdAt: string;
  expiresAt?: string;    // ISO date, optional TTL
}

export interface AuthConfig {
  credentials: AgentCredential[];
  requireAuth: boolean;   // if false, auth is skipped (dev mode)
  maxAuthAttempts?: number;      // Default: 5
  authCooldownMs?: number;       // Default: 10000 (10s per token)
}

// Module-level, but configurable
let authLimiterInstance: TokenBucketRateLimiter | null = null;

function getAuthLimiter(config: AuthConfig): TokenBucketRateLimiter {
  if (!authLimiterInstance) {
    authLimiterInstance = new TokenBucketRateLimiter({
      maxTokens: config.maxAuthAttempts ?? 5,
      refillRate: 1,
      refillInterval: config.authCooldownMs ?? 10000,
    });
  }
  return authLimiterInstance;
}

export interface AuthResult {
  authenticated: boolean;
  agentId?: string;
  scopes?: string[];
  reason?: string;
}

export function hashApiKey(plainKey: string): string {
  return crypto.createHash("sha256").update(plainKey).digest("hex");
}

export function generateApiKey(): { plain: string; hashed: string } {
  const plain = `akcp_${crypto.randomBytes(24).toString("hex")}`;
  const hashed = hashApiKey(plain);
  return { plain, hashed };
}

export interface AuthenticateOptions {
  /** Identifier for the requester (e.g., IP address, connection ID) */
  sourceId?: string;
}

export function authenticate(
  apiKey: string | undefined,
  config: AuthConfig,
  options: AuthenticateOptions = {},
): AuthResult {
  if (!config.requireAuth) {
    return { authenticated: true, agentId: "anonymous" };
  }

  const authLimiter = getAuthLimiter(config);
  
  // Brute-force protection
  const sourceKey = options.sourceId || "global";
  if (!authLimiter.consume(sourceKey)) {
    return {
      authenticated: false,
      reason: "Too many authentication attempts. Try again later.",
    };
  }

  if (!apiKey) {
    return {
      authenticated: false,
      reason: "No API key provided. Include _apiKey in request payload or X-AKCP-Key header.",
    };
  }

  const keyHash = hashApiKey(apiKey);
  const credential = config.credentials.find((c) => c.apiKey === keyHash);

  if (!credential) {
    return {
      authenticated: false,
      reason: "Invalid API key.",
    };
  }

  // Check expiration
  if (credential.expiresAt) {
    const expires = new Date(credential.expiresAt);
    if (expires < new Date()) {
      return {
        authenticated: false,
        reason: `API key for agent '${credential.agentId}' has expired.`,
      };
    }
  }

  // Success — reset the limiter for this source (reward valid keys)
  authLimiter.reset(sourceKey);

  return {
    authenticated: true,
    agentId: credential.agentId,
    scopes: credential.scopes,
  };
}
