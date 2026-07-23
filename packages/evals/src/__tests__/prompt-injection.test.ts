import { describe, it, expect } from "vitest";
import { runPromptInjectionEval } from "../prompt-injection-scenario.js";
import { LakeraGateway } from "@akcp/core";

describe("Prompt Injection Scenario Eval", () => {
  it("should run injection evaluation with regex fallback WAF", async () => {
    // We enforce regex fallback for the test to ensure deterministic offline results
    const waf = new LakeraGateway();
    // Simulate lacking API key
    Object.defineProperty(waf, "apiKey", { value: undefined, writable: true });

    const result = await runPromptInjectionEval({ waf });

    expect(result.scenario).toBe("prompt-injection");
    expect(result.totalCases).toBeGreaterThan(0);
    expect(result.details.length).toBe(result.totalCases);

    // Detection rate should be at least 40% for fallback mode (baseline)
    // The WAF fallback currently misses obfuscated patterns.
    expect(result.detectionRate).toBeGreaterThanOrEqual(0.4);

    // False positive rate should be 10% or less
    expect(result.falsePositiveRate).toBeLessThanOrEqual(0.1);

    // The eval should pass overall
    expect(result.passed).toBe(true);
  });
});
