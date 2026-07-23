import { describe, it, expect, beforeEach } from "vitest";
import { TokenBucketRateLimiter } from "../../capabilities/rate-limiter.js";

describe("TokenBucketRateLimiter", () => {
  let limiter: TokenBucketRateLimiter;

  beforeEach(() => {
    limiter = new TokenBucketRateLimiter({
      maxTokens: 5,
      refillRate: 1,
      refillInterval: 1000,
    });
  });

  it("should allow requests within limit", () => {
    expect(limiter.consume("agent-1")).toBe(true);
    expect(limiter.consume("agent-1")).toBe(true);
    expect(limiter.consume("agent-1")).toBe(true);
  });

  it("should block requests when bucket is empty", () => {
    for (let i = 0; i < 5; i++) {
      expect(limiter.consume("agent-1")).toBe(true);
    }
    expect(limiter.consume("agent-1")).toBe(false);
  });

  it("should track agents independently", () => {
    for (let i = 0; i < 5; i++) {
      limiter.consume("agent-1");
    }
    expect(limiter.consume("agent-1")).toBe(false);
    expect(limiter.consume("agent-2")).toBe(true);
  });

  it("should refill tokens over time", async () => {
    for (let i = 0; i < 5; i++) {
      limiter.consume("agent-1");
    }
    expect(limiter.consume("agent-1")).toBe(false);

    // Wait for refill
    await new Promise((r) => setTimeout(r, 1100));
    expect(limiter.consume("agent-1")).toBe(true);
  });

  it("should not exceed maxTokens on refill", async () => {
    // Don't consume anything, wait, check remaining doesn't exceed max
    await new Promise((r) => setTimeout(r, 2000));
    expect(limiter.remaining("agent-1")).toBeLessThanOrEqual(5);
  });

  it("should report remaining tokens", () => {
    expect(limiter.remaining("agent-1")).toBe(5);
    limiter.consume("agent-1");
    expect(limiter.remaining("agent-1")).toBe(4);
  });

  it("should reset a specific agent bucket", () => {
    for (let i = 0; i < 5; i++) limiter.consume("agent-1");
    expect(limiter.consume("agent-1")).toBe(false);
    limiter.reset("agent-1");
    expect(limiter.consume("agent-1")).toBe(true);
  });
});
