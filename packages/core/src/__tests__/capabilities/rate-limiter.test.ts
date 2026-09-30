import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TokenBucketRateLimiter } from "../../capabilities/rate-limiter.js";

describe("TokenBucketRateLimiter", () => {
  let limiter: TokenBucketRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new TokenBucketRateLimiter({
      maxTokens: 3,
      refillRate: 1, // 1 token per interval
      refillInterval: 1000, // 1 second
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Basic consume / remaining ---------------------------------------------

  it("allows consumption up to maxTokens before exhausting", () => {
    expect(limiter.consume("agent-a")).toBe(true); // 2 remaining
    expect(limiter.consume("agent-a")).toBe(true); // 1 remaining
    expect(limiter.consume("agent-a")).toBe(true); // 0 remaining
    expect(limiter.consume("agent-a")).toBe(false); // exhausted
  });

  it("returns remaining tokens correctly", () => {
    // No bucket yet - defaults to maxTokens
    expect(limiter.remaining("agent-x")).toBe(3);

    limiter.consume("agent-x");
    expect(limiter.remaining("agent-x")).toBe(2);

    limiter.consume("agent-x");
    expect(limiter.remaining("agent-x")).toBe(1);
  });

  // --- Per-key isolation ----------------------------------------------------

  it("per-key isolation: draining agent-A does NOT affect agent-B", () => {
    // Exhaust agent-A completely
    expect(limiter.consume("agent-a")).toBe(true);
    expect(limiter.consume("agent-a")).toBe(true);
    expect(limiter.consume("agent-a")).toBe(true);
    expect(limiter.consume("agent-a")).toBe(false); // exhausted

    // agent-B should still have its full 3 tokens
    expect(limiter.remaining("agent-b")).toBe(3);
    expect(limiter.consume("agent-b")).toBe(true);
    expect(limiter.consume("agent-b")).toBe(true);
    expect(limiter.consume("agent-b")).toBe(true);
    expect(limiter.consume("agent-b")).toBe(false); // exhausted independently
  });

  it("per-key isolation: resetting agent-A does NOT restore agent-B", () => {
    limiter.consume("agent-a");
    limiter.consume("agent-b");

    limiter.reset("agent-a");

    // agent-A is reset (full bucket)
    expect(limiter.remaining("agent-a")).toBe(3);
    // agent-B bucket was NOT touched - still has 2 remaining
    expect(limiter.remaining("agent-b")).toBe(2);
  });

  // --- Burst rejection -------------------------------------------------------

  it("burst rejection: rejects requests above maxTokens in a single tick", () => {
    const results: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      results.push(limiter.consume("burst-agent"));
    }

    // First 3 should succeed, remaining 2 should be rejected
    expect(results).toEqual([true, true, true, false, false]);
  });

  // --- Refill behavior -------------------------------------------------------

  it("refills tokens after one refill interval elapses", () => {
    // Drain completely
    limiter.consume("refill-agent");
    limiter.consume("refill-agent");
    limiter.consume("refill-agent");
    expect(limiter.consume("refill-agent")).toBe(false); // exhausted

    // Advance time by one full refill interval
    vi.advanceTimersByTime(1000);

    // Should have 1 new token (refillRate = 1 token per interval)
    expect(limiter.consume("refill-agent")).toBe(true);
    expect(limiter.consume("refill-agent")).toBe(false); // only 1 was refilled
  });

  it("does not exceed maxTokens during refill", () => {
    // Do not consume anything; advance time significantly
    vi.advanceTimersByTime(10000); // 10x the refill interval

    // First consume triggers refill calculation - should be capped at maxTokens
    expect(limiter.consume("refill-cap-agent")).toBe(true);
    expect(limiter.remaining("refill-cap-agent")).toBe(2); // Was 3, consumed 1
  });

  // --- clear() semantics -----------------------------------------------------

  it("clear(): resets all buckets simultaneously", () => {
    // Drain multiple agents
    limiter.consume("a1");
    limiter.consume("a1");
    limiter.consume("a2");

    // Confirm state before clear
    expect(limiter.remaining("a1")).toBe(1);
    expect(limiter.remaining("a2")).toBe(2);

    limiter.clear();

    // All agents should now report maxTokens (clean state)
    expect(limiter.remaining("a1")).toBe(3);
    expect(limiter.remaining("a2")).toBe(3);
  });

  it("clear(): allows fresh consumption after clearing an exhausted agent", () => {
    // Exhaust agent
    limiter.consume("agent-clear");
    limiter.consume("agent-clear");
    limiter.consume("agent-clear");
    expect(limiter.consume("agent-clear")).toBe(false);

    limiter.clear();

    // Should be able to consume again after clear
    expect(limiter.consume("agent-clear")).toBe(true);
  });

  // --- reset() semantics -----------------------------------------------------

  it("reset(): removes a specific key's bucket", () => {
    limiter.consume("agent-reset");
    expect(limiter.remaining("agent-reset")).toBe(2);

    limiter.reset("agent-reset");

    // After reset, key should be as if never seen (maxTokens)
    expect(limiter.remaining("agent-reset")).toBe(3);
  });

  it("reset(): does not affect other keys", () => {
    limiter.consume("keep");
    limiter.consume("reset-me");
    limiter.consume("reset-me");

    limiter.reset("reset-me");

    // keep should still show 2 remaining
    expect(limiter.remaining("keep")).toBe(2);
    // reset-me should now have full 3 tokens
    expect(limiter.remaining("reset-me")).toBe(3);
  });
});
