import { describe, it, expect } from "vitest";
import { InternalPolicyProvider } from "../../policies/internal-provider.js";
import type { PolicyRule, PolicyRequest } from "../../policies/engine.js";

describe("InternalPolicyProvider", () => {
  const sampleRule: PolicyRule = {
    id: "allow-docs",
    description: "Allow reading docs",
    priority: 1,
    effect: "allow",
    match: {
      tools: ["read_*", "list_*"],
    },
  };

  const sampleRequest: PolicyRequest = {
    tool: "read_document",
    agentId: "agent-1",
    riskLevel: "low",
    scopes: ["doc:read"],
  };

  it("evaluates rules against incoming request", async () => {
    const provider = new InternalPolicyProvider();
    await provider.reload({ policies: [sampleRule] });

    const decision = await provider.evaluate(sampleRequest);
    expect(decision.effect).toBe("allow");
    expect(decision.matchedRule.id).toBe("allow-docs");
  });

  it("generates evaluation trace on explain", async () => {
    const provider = new InternalPolicyProvider();
    await provider.reload({ policies: [sampleRule] });

    const trace = await provider.explain(sampleRequest);
    expect(trace).toBeDefined();
    expect(trace.decision.effect).toBe("allow");
  });

  it("reports healthy status", async () => {
    const provider = new InternalPolicyProvider();
    expect(await provider.healthy()).toBe(true);
  });
});
