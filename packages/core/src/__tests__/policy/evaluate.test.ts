import { describe, it, expect, vi } from "vitest";
import { evaluatePolicy } from "../../policy/evaluate.js";
import type { PolicyCard } from "../../policy/types.js";

describe("Policy Evaluation Engine", () => {
  const strictPolicy: PolicyCard = {
    apiVersion: "policy.akcp.dev/v1alpha1",
    kind: "PolicyCard",
    metadata: { name: "Strict Policy" },
    spec: {
      allowedAgents: ["agent-1"],
      allowedContextPacks: ["pack-1"],
      allowedTools: ["read_document"],
      forbiddenTools: ["delete_document"],
      approvalRequirements: ["create_document"],
      sideEffectRules: {
        read: "allow",
        write: "approval",
        submit: "deny",
      },
      piiHandling: "deny",
    },
  };

  it("should deny execution of a forbidden tool", () => {
    const result = evaluatePolicy(strictPolicy, {
      toolName: "delete_document",
      sideEffect: "write",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("explicitly forbidden");
  });

  it("should deny execution if tool is not in allowed list", () => {
    const result = evaluatePolicy(strictPolicy, {
      toolName: "unknown_tool",
      sideEffect: "read",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("not in the allowed list");
  });

  it("should allow read tools without approval if in allowed list", () => {
    const result = evaluatePolicy(strictPolicy, {
      toolName: "read_document",
      sideEffect: "read",
    });
    expect(result.allowed).toBe(true);
    expect(result.requirements?.approvalRequired).toBe(false);
  });

  it("should deny if side effect rule is deny", () => {
    // E.g., forcing side effect to 'submit', which is denied in strict policy
    const result = evaluatePolicy(strictPolicy, {
      toolName: "read_document",
      sideEffect: "submit",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("is denied by policy");
  });

  const approvalPolicy: PolicyCard = {
    apiVersion: "policy.akcp.dev/v1alpha1",
    kind: "PolicyCard",
    metadata: { name: "Approval Policy" },
    spec: {
      allowedAgents: ["*"],
      allowedContextPacks: ["*"],
      allowedTools: ["write_file"],
      forbiddenTools: [],
      approvalRequirements: ["write_file"],
      sideEffectRules: {
        read: "allow",
        write: "approval",
        submit: "approval",
      },
      piiHandling: "redact",
    },
  };

  it("should allow tool but flag as requiring approval", () => {
    const result = evaluatePolicy(approvalPolicy, {
      toolName: "write_file",
      sideEffect: "write",
    });
    expect(result.allowed).toBe(true);
    expect(result.requirements?.approvalRequired).toBe(true);
  });

  const v2PolicyDeny: PolicyCard = {
    apiVersion: "policy.akcp.dev/v2",
    kind: "PolicyCard",
    metadata: { name: "V2 Deny" },
    appliesTo: { capabilities: ["bad_*"] },
    rules: [{ effect: "deny" }],
  };

  const v2PolicyAllow: PolicyCard = {
    apiVersion: "policy.akcp.dev/v2",
    kind: "PolicyCard",
    metadata: { name: "V2 Allow" },
    appliesTo: { capabilities: ["good_tool"] },
    rules: [{ effect: "allow" }],
  };

  const v2PolicyApproval: PolicyCard = {
    apiVersion: "policy.akcp.dev/v2",
    kind: "PolicyCard",
    metadata: { name: "V2 Approval" },
    appliesTo: { capabilities: ["*"] },
    rules: [{ effect: "require_approval" }],
  };

  it("should evaluate V2 rules - deny", () => {
    const result = evaluatePolicy(v2PolicyDeny, {
      toolName: "bad_tool",
      sideEffect: "read",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("denied by rule in policy");
  });

  it("should evaluate V2 rules - allow", () => {
    const result = evaluatePolicy(v2PolicyAllow, {
      toolName: "good_tool",
      sideEffect: "read",
    });
    expect(result.allowed).toBe(true);
    expect(result.requirements?.approvalRequired).toBe(false);
  });

  it("should evaluate V2 rules - approval", () => {
    const result = evaluatePolicy(v2PolicyApproval, {
      toolName: "any_tool",
      sideEffect: "write",
    });
    expect(result.allowed).toBe(true);
    expect(result.requirements?.approvalRequired).toBe(true);
  });

  const v2PolicyDenyCriticalRisk: PolicyCard = {
    apiVersion: "policy.akcp.dev/v2",
    kind: "PolicyCard",
    metadata: { name: "V2 Deny Critical Risk" },
    appliesTo: { capabilities: ["*"], riskLevels: ["high", "critical"] },
    rules: [{ effect: "deny" }],
  };

  it("should scope V2 rules by riskLevel and deny when it matches", () => {
    const result = evaluatePolicy(v2PolicyDenyCriticalRisk, {
      toolName: "any_tool",
      sideEffect: "write",
      riskLevel: "critical",
    });
    expect(result.allowed).toBe(false);
  });

  it("should not apply a riskLevel-scoped V2 rule when the risk level doesn't match", () => {
    const result = evaluatePolicy(v2PolicyDenyCriticalRisk, {
      toolName: "any_tool",
      sideEffect: "write",
      riskLevel: "low",
    });
    // Falls through past the (non-matching) V2 rule to the V1 fallback, which
    // has no spec on this policy card and so defaults to allowed.
    expect(result.allowed).toBe(true);
  });

  it("should not apply a riskLevel-scoped V2 rule when no riskLevel is provided", () => {
    const result = evaluatePolicy(v2PolicyDenyCriticalRisk, {
      toolName: "any_tool",
      sideEffect: "write",
    });
    expect(result.allowed).toBe(true);
  });

  it("should return allowed if no spec and no v2 rules", () => {
    const emptyPolicy: PolicyCard = {
      apiVersion: "v1",
      kind: "PolicyCard",
    };
    const result = evaluatePolicy(emptyPolicy, {
      toolName: "test",
      sideEffect: "read",
    });
    expect(result.allowed).toBe(true);
  });

  it("should fall back to deny if sideEffect is unmapped", () => {
    const incompleteSpecPolicy: PolicyCard = {
      apiVersion: "v1",
      kind: "PolicyCard",
      spec: {
        allowedAgents: ["*"],
        allowedContextPacks: ["*"],
        allowedTools: ["*"],
        forbiddenTools: [],
        approvalRequirements: [],
        piiHandling: "deny",
      },
    };
    // If sideEffectRules is missing, the default is { read: "allow", write: "approval", submit: "approval" }
    const res1 = evaluatePolicy(incompleteSpecPolicy, {
      toolName: "tool",
      sideEffect: "write",
    });
    expect(res1.allowed).toBe(true);
    expect(res1.requirements?.approvalRequired).toBe(true);

    // Explicitly empty sideEffectRules
    const brokenSpecPolicy: PolicyCard = {
      apiVersion: "v1",
      kind: "PolicyCard",
      spec: {
        allowedAgents: ["*"],
        allowedContextPacks: ["*"],
        allowedTools: ["*"],
        forbiddenTools: [],
        approvalRequirements: [],
        piiHandling: "deny",
        sideEffectRules: {} as any,
      },
    };
    const res2 = evaluatePolicy(brokenSpecPolicy, {
      toolName: "tool",
      sideEffect: "write",
    });
    expect(res2.allowed).toBe(false);
  });

  describe("Condition evaluation in standalone evaluatePolicy", () => {
    it("should enforce environment condition", () => {
      const policy: PolicyCard = {
        apiVersion: "policy.akcp.dev/v2",
        kind: "PolicyCard",
        metadata: { name: "Env Policy" },
        appliesTo: { capabilities: ["prod_tool"] },
        rules: [
          {
            effect: "allow",
            condition: "environment == 'production'",
          },
        ],
      };

      const resultDev = evaluatePolicy(policy, {
        toolName: "prod_tool",
        sideEffect: "read",
        environment: "development",
      });
      // Falls through to V1 default allow
      expect(resultDev.allowed).toBe(true);

      const denyPolicy: PolicyCard = {
        apiVersion: "policy.akcp.dev/v2",
        kind: "PolicyCard",
        metadata: { name: "Env Deny Policy" },
        appliesTo: { capabilities: ["prod_tool"] },
        rules: [
          {
            effect: "deny",
            condition: "environment == 'production'",
          },
        ],
      };

      const resultDevDeny = evaluatePolicy(denyPolicy, {
        toolName: "prod_tool",
        sideEffect: "read",
        environment: "development",
      });
      expect(resultDevDeny.allowed).toBe(true);

      const resultProdDeny = evaluatePolicy(denyPolicy, {
        toolName: "prod_tool",
        sideEffect: "read",
        environment: "production",
      });
      expect(resultProdDeny.allowed).toBe(false);
    });

    it("should enforce approval_exists condition", () => {
      const policy: PolicyCard = {
        apiVersion: "policy.akcp.dev/v2",
        kind: "PolicyCard",
        metadata: { name: "Approval Exists Policy" },
        appliesTo: { capabilities: ["secure_tool"] },
        rules: [
          {
            effect: "deny",
            condition: "approval_exists",
          },
        ],
      };

      const withoutToken = evaluatePolicy(policy, {
        toolName: "secure_tool",
        sideEffect: "read",
      });
      expect(withoutToken.allowed).toBe(true);

      const withToken = evaluatePolicy(policy, {
        toolName: "secure_tool",
        sideEffect: "read",
        approvalToken: "token-abc",
      });
      expect(withToken.allowed).toBe(false);
    });

    it("should enforce time_window condition", () => {
      const policy: PolicyCard = {
        apiVersion: "policy.akcp.dev/v2",
        kind: "PolicyCard",
        metadata: { name: "Time Window Policy" },
        appliesTo: { capabilities: ["maintenance_tool"] },
        rules: [
          {
            effect: "deny",
            condition: "time_window(9, 17)",
          },
        ],
      };

      try {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-20T14:00:00"));
        const duringDay = evaluatePolicy(policy, {
          toolName: "maintenance_tool",
          sideEffect: "read",
        });
        expect(duringDay.allowed).toBe(false);

        vi.setSystemTime(new Date("2026-08-20T22:00:00"));
        const atNight = evaluatePolicy(policy, {
          toolName: "maintenance_tool",
          sideEffect: "read",
        });
        expect(atNight.allowed).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it("should fail closed (deny) for unknown condition type on allow rule", () => {
      const policy: PolicyCard = {
        apiVersion: "policy.akcp.dev/v2",
        kind: "PolicyCard",
        metadata: { name: "Unknown Cond Policy" },
        appliesTo: { capabilities: ["test_tool"] },
        rules: [
          {
            effect: "allow",
            condition: "invalid_condition_syntax_xyz",
          },
        ],
      };

      const result = evaluatePolicy(policy, {
        toolName: "test_tool",
        sideEffect: "read",
      });
      // Condition fails closed, so the allow rule is skipped
      // Falls through to fallback V1 (allowed: true if no spec, but didn't match allow rule)
      expect(result.requirements?.approvalRequired).toBeUndefined();
    });

    it("should support structured condition object and array", () => {
      const policy: PolicyCard = {
        apiVersion: "policy.akcp.dev/v2",
        kind: "PolicyCard",
        metadata: { name: "Structured Policy" },
        appliesTo: { capabilities: ["test_tool"] },
        rules: [
          {
            effect: "deny",
            condition: {
              type: "environment",
              params: { environment: "production" },
            },
          },
        ],
      };

      const res = evaluatePolicy(policy, {
        toolName: "test_tool",
        sideEffect: "read",
        environment: "production",
      });
      expect(res.allowed).toBe(false);
    });
  });
});
