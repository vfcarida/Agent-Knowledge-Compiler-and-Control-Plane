import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CostTracker,
  estimateTokens,
} from "../../capabilities/cost-tracker.js";
import { agentTokensConsumedCounter } from "../../observability/otel.js";

describe("estimateTokens", () => {
  it("estimates tokens based on string character heuristic (4 chars/token)", () => {
    // 20 characters -> 5 tokens
    const payload = { a: "1234567890" };
    const tokens = estimateTokens(payload, {});
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBe(
      Math.ceil((JSON.stringify(payload) + JSON.stringify({})).length / 4),
    );
  });

  it("handles string payloads directly without extra quoting", () => {
    const tokens = estimateTokens("12345678", "12345678");
    expect(tokens).toBe(4); // 16 chars / 4 = 4
  });

  it("returns minimum 1 token for empty or null payloads", () => {
    expect(estimateTokens(null, undefined)).toBe(1);
    expect(estimateTokens("", "")).toBe(1);
  });
});

describe("CostTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accumulates tokens and tracks calls per agent", () => {
    const tracker = new CostTracker();
    const addSpy = vi.spyOn(agentTokensConsumedCounter, "add");

    const res1 = tracker.recordUsage("agent-alpha", 50, "search_docs");
    expect(res1.cumulativeTokens).toBe(50);
    expect(res1.tokens).toBe(50);
    expect(res1.budgetExceeded).toBe(false);
    expect(addSpy).toHaveBeenCalledWith(50, {
      agentId: "agent-alpha",
      toolName: "search_docs",
    });

    const res2 = tracker.recordUsage("agent-alpha", 75, "read_document");
    expect(res2.cumulativeTokens).toBe(125);
    expect(tracker.getCumulativeTokens("agent-alpha")).toBe(125);

    const usage = tracker.getUsage("agent-alpha");
    expect(usage).toBeDefined();
    expect(usage?.callCount).toBe(2);
    expect(usage?.lastCallTokens).toBe(75);
  });

  it("handles default anonymous agent key", () => {
    const tracker = new CostTracker();
    const res = tracker.recordUsage("", 30);
    expect(res.agentId).toBe("anonymous");
    expect(tracker.getCumulativeTokens("anonymous")).toBe(30);
  });

  it("triggers warning and callback on soft budget exceed", () => {
    const onExceeded = vi.fn();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const tracker = new CostTracker({
      agentBudgets: {
        "budget-agent": 100,
      },
      onBudgetExceeded: onExceeded,
    });

    // Below budget
    const r1 = tracker.recordUsage("budget-agent", 80);
    expect(r1.budgetExceeded).toBe(false);
    expect(tracker.isBudgetExceeded("budget-agent")).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(onExceeded).not.toHaveBeenCalled();

    // Exceeds budget
    const r2 = tracker.recordUsage("budget-agent", 30);
    expect(r2.budgetExceeded).toBe(true);
    expect(r2.cumulativeTokens).toBe(110);
    expect(tracker.isBudgetExceeded("budget-agent")).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    expect(onExceeded).toHaveBeenCalledWith(
      "budget-agent",
      expect.objectContaining({ cumulativeTokens: 110, budget: 100 }),
      100,
    );

    warnSpy.mockRestore();
  });

  it("supports defaultBudget fallback and setBudget", () => {
    const tracker = new CostTracker({ defaultBudget: 200 });
    expect(tracker.getBudget("unknown-agent")).toBe(200);

    tracker.setBudget("custom-agent", 500);
    expect(tracker.getBudget("custom-agent")).toBe(500);
  });

  it("provides getAllUsage and reset functionality", () => {
    const tracker = new CostTracker();
    tracker.recordUsage("agent-1", 10);
    tracker.recordUsage("agent-2", 20);

    const all = tracker.getAllUsage();
    expect(Object.keys(all)).toEqual(["agent-1", "agent-2"]);
    expect(all["agent-1"].cumulativeTokens).toBe(10);
    expect(all["agent-2"].cumulativeTokens).toBe(20);

    // Reset specific agent
    tracker.reset("agent-1");
    expect(tracker.getCumulativeTokens("agent-1")).toBe(0);
    expect(tracker.getCumulativeTokens("agent-2")).toBe(20);

    // Reset all
    tracker.reset();
    expect(tracker.getCumulativeTokens("agent-2")).toBe(0);
  });
});
