import { describe, it, expect, vi, beforeEach } from "vitest";
import { RedisRateLimiter } from "../../capabilities/redis-rate-limiter.js";
import {
  TokenBucketRateLimiter,
  createRateLimiter,
  type RateLimiterConfig,
} from "../../capabilities/rate-limiter.js";
import { MCPGateway, MCPGatewayError } from "../../capabilities/gateway.js";
import type { CapabilityRequest } from "../../capabilities/request.js";

// Mock ioredis with an in-memory token bucket hash emulation for eval calls
vi.mock("ioredis", () => {
  return {
    Redis: vi.fn().mockImplementation(() => {
      let hashes: Record<string, Record<string, string>> = {};

      return {
        eval: vi
          .fn()
          .mockImplementation(
            async (
              script: string,
              _numKeys: number,
              key: string,
              maxTokensStr: string,
              refillRateStr: string,
              refillIntervalStr: string,
              nowStr: string,
            ) => {
              const maxTokens = Number(maxTokensStr);
              const refillRate = Number(refillRateStr);
              const refillInterval = Number(refillIntervalStr);
              const now = Number(nowStr);

              let bucket = hashes[key];
              if (!bucket) {
                bucket = {
                  tokens: maxTokens.toString(),
                  lastRefill: now.toString(),
                };
                hashes[key] = bucket;
              }

              let tokens = Number(bucket["tokens"]);
              let lastRefill = Number(bucket["lastRefill"]);

              const elapsed = now - lastRefill;
              if (elapsed > 0) {
                const tokensToAdd = Math.floor(
                  (elapsed / refillInterval) * refillRate,
                );
                if (tokensToAdd > 0) {
                  tokens = Math.min(maxTokens, tokens + tokensToAdd);
                  lastRefill = now;
                }
              }

              if (script.includes("return 1") || script.includes("return 0")) {
                // Consume script
                if (tokens > 0) {
                  tokens -= 1;
                  bucket["tokens"] = tokens.toString();
                  bucket["lastRefill"] = lastRefill.toString();
                  return 1;
                } else {
                  bucket["tokens"] = tokens.toString();
                  bucket["lastRefill"] = lastRefill.toString();
                  return 0;
                }
              } else {
                // Remaining script
                return tokens;
              }
            },
          ),
        del: vi.fn().mockImplementation(async (...keys: string[]) => {
          let count = 0;
          for (const k of keys) {
            if (hashes[k]) {
              delete hashes[k];
              count++;
            }
          }
          return count;
        }),
        keys: vi.fn().mockImplementation(async (pattern: string) => {
          const prefix = pattern.replace("*", "");
          return Object.keys(hashes).filter((k) => k.startsWith(prefix));
        }),
        quit: vi.fn().mockResolvedValue("OK"),
        _reset: () => {
          hashes = {};
        },
      };
    }),
  };
});

describe("RedisRateLimiter", () => {
  let limiter: RedisRateLimiter;
  let config: RateLimiterConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    config = {
      maxTokens: 5,
      refillRate: 1,
      refillInterval: 1000,
      backend: "redis",
    };
    limiter = new RedisRateLimiter(config);
    // Reset simulated storage

    (limiter as any).redis._reset();
  });

  it("should allow requests within maxTokens limit", async () => {
    expect(await limiter.consume("agent-1")).toBe(true);
    expect(await limiter.consume("agent-1")).toBe(true);
    expect(await limiter.consume("agent-1")).toBe(true);
  });

  it("should block requests when bucket is exhausted", async () => {
    for (let i = 0; i < 5; i++) {
      expect(await limiter.consume("agent-1")).toBe(true);
    }
    expect(await limiter.consume("agent-1")).toBe(false);
  });

  it("should track agents in independent redis keys", async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.consume("agent-1");
    }
    expect(await limiter.consume("agent-1")).toBe(false);
    expect(await limiter.consume("agent-2")).toBe(true);
  });

  it("should report remaining tokens accurately", async () => {
    expect(await limiter.remaining("agent-1")).toBe(5);
    await limiter.consume("agent-1");
    expect(await limiter.remaining("agent-1")).toBe(4);
    await limiter.consume("agent-1");
    expect(await limiter.remaining("agent-1")).toBe(3);
  });

  it("should reset a specific agent bucket", async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.consume("agent-1");
    }
    expect(await limiter.consume("agent-1")).toBe(false);

    await limiter.reset("agent-1");
    expect(await limiter.consume("agent-1")).toBe(true);
  });

  it("should clear all rate limit buckets matching prefix", async () => {
    await limiter.consume("agent-1");
    await limiter.consume("agent-2");

    await limiter.clear();
    expect(await limiter.remaining("agent-1")).toBe(5);
    expect(await limiter.remaining("agent-2")).toBe(5);
  });

  it("should use custom prefix if provided", async () => {
    const customLimiter = new RedisRateLimiter({
      maxTokens: 3,
      refillRate: 1,
      backend: "redis",
      redis: { prefix: "custom:prefix:" },
    });

    expect((customLimiter as any).prefix).toBe("custom:prefix:");
  });

  it("should accept an externally provided Redis client", async () => {
    const mockClient: any = {
      eval: vi.fn().mockResolvedValue(1),
      del: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue([]),
    };

    const customLimiter = new RedisRateLimiter({
      maxTokens: 5,
      refillRate: 1,
      backend: "redis",
      redis: { client: mockClient },
    });

    const allowed = await customLimiter.consume("agent-1");
    expect(allowed).toBe(true);
    expect(mockClient.eval).toHaveBeenCalled();
  });
});

describe("createRateLimiter Factory", () => {
  it("should return TokenBucketRateLimiter by default (no backend specified)", () => {
    const limiter = createRateLimiter({
      maxTokens: 10,
      refillRate: 2,
    });
    expect(limiter).toBeInstanceOf(TokenBucketRateLimiter);
  });

  it("should return TokenBucketRateLimiter when backend is 'memory'", () => {
    const limiter = createRateLimiter({
      maxTokens: 10,
      refillRate: 2,
      backend: "memory",
    });
    expect(limiter).toBeInstanceOf(TokenBucketRateLimiter);
  });

  it("should return RedisRateLimiter when backend is 'redis'", () => {
    const limiter = createRateLimiter({
      maxTokens: 10,
      refillRate: 2,
      backend: "redis",
    });
    expect(limiter).toBeInstanceOf(RedisRateLimiter);
  });
});

describe("MCPGateway with Redis Rate Limiting", () => {
  it("should enforce rate limiting via Redis backend in gateway execution", async () => {
    const mockPolicy = {
      apiVersion: "policy.akcp.dev/v1alpha1",
      kind: "PolicyCard",
      metadata: { name: "test-policy" },
      spec: {
        allowedTools: ["test_tool"],
        forbiddenTools: [],
        sideEffectRules: {
          read: "allow",
        },
        approvalRequirements: [],
        piiHandling: "allow",
      },
    };

    const gateway = new MCPGateway({
      policies: {
        "agent-redis": mockPolicy as any,
      },
      rateLimiter: {
        maxTokens: 2,
        refillRate: 1,
        backend: "redis",
      },
    });

    const request: CapabilityRequest = {
      requestId: "req-1",
      toolName: "test_tool",
      sideEffect: "read",
      riskLevel: "low",
      agentId: "agent-redis",
      payload: {},
    };

    const result1 = await gateway.execute(request, async () => "ok-1");
    expect(result1).toBe("ok-1");

    const result2 = await gateway.execute(request, async () => "ok-2");
    expect(result2).toBe("ok-2");

    await expect(gateway.execute(request, async () => "ok-3")).rejects.toThrow(
      MCPGatewayError,
    );
  });
});
