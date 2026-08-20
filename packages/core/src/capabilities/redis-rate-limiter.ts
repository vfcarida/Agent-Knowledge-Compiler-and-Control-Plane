import { Redis } from "ioredis";
import type { IRateLimiter, RateLimiterConfig } from "./rate-limiter.js";

// Lua script for atomic token bucket in Redis:
// KEYS[1] = bucket key
// ARGV[1] = maxTokens
// ARGV[2] = refillRate (tokens per second)
// ARGV[3] = refillInterval (ms)
// ARGV[4] = now (timestamp in ms)
// Returns: 1 if token consumed, 0 if rate limited
const CONSUME_SCRIPT = `
local key = KEYS[1]
local maxTokens = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local refillInterval = tonumber(ARGV[3])
local now = tonumber(ARGV[4])
local ttl = math.ceil((maxTokens / math.max(refillRate, 1)) * (refillInterval / 1000) * 2) + 60

local data = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(data[1])
local lastRefill = tonumber(data[2])

if not tokens or not lastRefill then
  tokens = maxTokens
  lastRefill = now
else
  local elapsed = now - lastRefill
  if elapsed > 0 then
    local tokensToAdd = math.floor((elapsed / refillInterval) * refillRate)
    if tokensToAdd > 0 then
      tokens = math.min(maxTokens, tokens + tokensToAdd)
      lastRefill = now
    end
  end
end

if tokens > 0 then
  tokens = tokens - 1
  redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
  redis.call('EXPIRE', key, ttl)
  return 1
else
  redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
  redis.call('EXPIRE', key, ttl)
  return 0
end
`;

const REMAINING_SCRIPT = `
local key = KEYS[1]
local maxTokens = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local refillInterval = tonumber(ARGV[3])
local now = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(data[1])
local lastRefill = tonumber(data[2])

if not tokens or not lastRefill then
  return maxTokens
end

local elapsed = now - lastRefill
if elapsed > 0 then
  local tokensToAdd = math.floor((elapsed / refillInterval) * refillRate)
  if tokensToAdd > 0 then
    tokens = math.min(maxTokens, tokens + tokensToAdd)
  end
end

return tokens
`;

export class RedisRateLimiter implements IRateLimiter {
  private redis: Redis;
  private prefix: string;
  private config: Required<
    Pick<RateLimiterConfig, "maxTokens" | "refillRate" | "refillInterval">
  >;
  private ownsClient: boolean;

  constructor(config: RateLimiterConfig) {
    this.config = {
      maxTokens: config.maxTokens,
      refillRate: config.refillRate,
      refillInterval: config.refillInterval ?? 1000,
    };
    this.prefix = config.redis?.prefix ?? "akcp:ratelimit:";
    if (config.redis?.client) {
      this.redis = config.redis.client;
      this.ownsClient = false;
    } else {
      const url =
        config.redis?.url || process.env.REDIS_URL || "redis://localhost:6379";
      this.redis = new Redis(url);
      this.ownsClient = true;
    }
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Attempts to consume one token for the given key in Redis.
   * Returns true if allowed, false if rate limited.
   */
  async consume(key: string): Promise<boolean> {
    const now = Date.now();
    const result = await this.redis.eval(
      CONSUME_SCRIPT,
      1,
      this.getKey(key),
      this.config.maxTokens.toString(),
      this.config.refillRate.toString(),
      this.config.refillInterval.toString(),
      now.toString(),
    );
    return Number(result) === 1;
  }

  /**
   * Returns remaining tokens for a key in Redis.
   */
  async remaining(key: string): Promise<number> {
    const now = Date.now();
    const result = await this.redis.eval(
      REMAINING_SCRIPT,
      1,
      this.getKey(key),
      this.config.maxTokens.toString(),
      this.config.refillRate.toString(),
      this.config.refillInterval.toString(),
      now.toString(),
    );
    return Number(result);
  }

  /**
   * Resets a specific key's bucket in Redis.
   */
  async reset(key: string): Promise<void> {
    await this.redis.del(this.getKey(key));
  }

  /**
   * Clears all rate limiter buckets matching the prefix.
   */
  async clear(): Promise<void> {
    const keys = await this.redis.keys(`${this.prefix}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Closes the Redis connection if owned by this instance.
   */
  async disconnect(): Promise<void> {
    if (this.ownsClient) {
      await this.redis.quit();
    }
  }
}
