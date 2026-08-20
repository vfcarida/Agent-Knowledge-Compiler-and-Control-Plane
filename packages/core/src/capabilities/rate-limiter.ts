import { RedisRateLimiter } from "./redis-rate-limiter.js";
export { RedisRateLimiter };

export type RateLimiterBackend = "memory" | "redis";

export interface RedisRateLimiterOptions {
  url?: string;
  prefix?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client?: any;
}

export interface RateLimiterConfig {
  maxTokens: number; // Maximum tokens in the bucket
  refillRate: number; // Tokens added per second
  refillInterval?: number; // Refill interval in ms (default: 1000)
  backend?: RateLimiterBackend; // "memory" (default) or "redis"
  redis?: RedisRateLimiterOptions;
}

export interface IRateLimiter {
  consume(key: string): boolean | Promise<boolean>;
  remaining(key: string): number | Promise<number>;
  reset(key: string): void | Promise<void>;
  clear?(): void | Promise<void>;
}

export type RateLimiter = IRateLimiter;

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class TokenBucketRateLimiter implements IRateLimiter {
  private buckets = new Map<string, Bucket>();
  private config: Required<
    Pick<RateLimiterConfig, "maxTokens" | "refillRate" | "refillInterval">
  >;

  constructor(config: RateLimiterConfig) {
    this.config = {
      maxTokens: config.maxTokens,
      refillRate: config.refillRate,
      refillInterval: config.refillInterval ?? 1000,
    };
  }

  /**
   * Attempts to consume one token for the given key (e.g. agentId).
   * Returns true if allowed, false if rate limited.
   */
  consume(key: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.config.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(
      (elapsed / this.config.refillInterval) * this.config.refillRate,
    );

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(
        this.config.maxTokens,
        bucket.tokens + tokensToAdd,
      );
      bucket.lastRefill = now;
    }

    // Try to consume
    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Returns remaining tokens for a key.
   */
  remaining(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket) return this.config.maxTokens;
    return bucket.tokens;
  }

  /**
   * Resets a specific key's bucket.
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Clears all buckets (useful for testing).
   */
  clear(): void {
    this.buckets.clear();
  }
}

/**
 * Factory function creating a RateLimiter instance based on configuration backend.
 * Default is in-memory TokenBucketRateLimiter.
 */
export function createRateLimiter(config: RateLimiterConfig): IRateLimiter {
  if (config.backend === "redis") {
    return new RedisRateLimiter(config);
  }
  return new TokenBucketRateLimiter(config);
}
