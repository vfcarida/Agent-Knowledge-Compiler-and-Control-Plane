import { describe, it, expect } from "vitest";
import { explainPolicy } from "../../policy/explain.js";
import type { PolicyCard } from "../../policy/types.js";

describe("explainPolicy", () => {
  it("explains a basic policy", () => {
    const policy: PolicyCard = {
      apiVersion: "akcp.policy/v1",
      kind: "Policy",
      metadata: { name: "Test Policy", description: "Desc" },
      appliesTo: { capabilities: ["test-tool"] },
      rules: [{ effect: "allow", condition: "riskLevel == 'low'" }],
      spec: {
        allowedAgents: ["agent1"],
        forbiddenTools: ["bad-tool"],
        sideEffectRules: { read: "allow", write: "approval", submit: "deny" },
        piiHandling: "redact",
        approvalRequirements: ["high-risk"],
        evidenceRequirements: ["logs"],
        mappings: {
          nist_ai_rmf: ["MAP_1"],
          owasp_llm: ["LLM01"],
        },
      },
    };
    const result = explainPolicy(policy);
    expect(result).toContain("Test Policy");
    expect(result).toContain("Desc");
    expect(result).toContain("test-tool");
    expect(result).toContain("allow (if: riskLevel == 'low')");
    expect(result).toContain("agent1");
    expect(result).toContain("bad-tool");
    expect(result).toContain("deny");
    expect(result).toContain("redact");
    expect(result).toContain("high-risk");
    expect(result).toContain("logs");
    expect(result).toContain("MAP_1");
    expect(result).toContain("LLM01");
  });

  it("handles missing optional fields", () => {
    const policy: PolicyCard = {
      apiVersion: "akcp.policy/v1",
      kind: "Policy",
      metadata: { name: "Test" },
    };
    const result = explainPolicy(policy);
    expect(result).toContain("Test");
    expect(result).not.toContain("--- Applies To ---");
    expect(result).not.toContain("--- Rules ---");
    expect(result).not.toContain("--- Access Rules (V1) ---");
  });

  it("handles empty spec fields gracefully", () => {
    const policy: PolicyCard = {
      apiVersion: "akcp.policy/v1",
      kind: "Policy",
      metadata: { name: "Test2" },
      appliesTo: { capabilities: [] },
      rules: [],
      spec: {
        allowedAgents: [],
        allowedContextPacks: [],
        allowedTools: [],
        forbiddenTools: [],
        approvalRequirements: [],
        sideEffectRules: undefined as any,
        piiHandling: undefined as any,
      },
    };
    const result = explainPolicy(policy);
    expect(result).toContain("Test2");
    expect(result).toContain("--- Applies To ---");
    expect(result).toContain("--- Access Rules (V1) ---");
    // Default read/write/submit
    expect(result).toContain("Read Actions: allow");
    expect(result).toContain("Write Actions: approval");
    expect(result).toContain("Submit Actions: approval");
    // Default pii handling
    expect(result).toContain("PII Handling: deny");
    // No evidence or approvals logged
    expect(result).not.toContain("Explicit Approval For:");
    expect(result).not.toContain("Evidence Required:");
    expect(result).not.toContain("--- Rules ---");
  });
});
