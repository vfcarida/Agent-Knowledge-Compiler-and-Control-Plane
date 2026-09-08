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

  it("initializes rules directly from constructor", async () => {
    const provider = new InternalPolicyProvider([sampleRule]);
    expect(provider.getRules()).toHaveLength(1);
    const decision = await provider.evaluate(sampleRequest);
    expect(decision.effect).toBe("allow");
  });

  it("initializes and reloads from a PolicyCard", async () => {
    const policyCard = {
      apiVersion: "policy.akcp.dev/v2" as const,
      kind: "PolicyCard" as const,
      metadata: { name: "test-card" },
      appliesTo: { capabilities: ["read_*"] },
      rules: [{ effect: "allow" as const }],
    };

    const provider = new InternalPolicyProvider(policyCard as any);
    expect(provider.getRules().length).toBeGreaterThan(0);

    const decision1 = await provider.evaluate(sampleRequest);
    expect(decision1.effect).toBe("allow");

    // Reload with a new policy card that denies
    const denyPolicyCard = {
      apiVersion: "policy.akcp.dev/v2" as const,
      kind: "PolicyCard" as const,
      metadata: { name: "deny-card" },
      appliesTo: { capabilities: ["read_*"] },
      rules: [{ effect: "deny" as const }],
    };

    await provider.reload({
      type: "inline",
      policyCard: denyPolicyCard as any,
    });
    const decision2 = await provider.evaluate(sampleRequest);
    expect(decision2.effect).toBe("deny");
  });
});
