export interface RateLimiterConfig {
  maxTokens: number;       // Maximum tokens in the bucket
  refillRate: number;      // Tokens added per second
  refillInterval?: number; // Refill interval in ms (default: 1000)
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class TokenBucketRateLimiter {
  private buckets = new Map<string, Bucket>();
  private config: Required<RateLimiterConfig>;

  constructor(config: RateLimiterConfig) {
    this.config = {
      ...config,
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
      bucket.tokens = Math.min(this.config.maxTokens, bucket.tokens + tokensToAdd);
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
