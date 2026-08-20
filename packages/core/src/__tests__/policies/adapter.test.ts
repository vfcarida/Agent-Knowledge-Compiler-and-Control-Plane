import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  adaptPolicyCardToRules,
  normalizeConditions,
} from "../../policies/adapter.js";
import { evaluatePolicies, type PolicyRequest } from "../../policies/engine.js";
import type { PolicyCard } from "../../policy/types.js";

describe("PolicyCard Adapter Condition Normalization", () => {
  it("normalizes environment condition strings", () => {
    expect(normalizeConditions("environment == 'production'")).toEqual([
      { type: "environment", params: { environment: "production" } },
    ]);
    expect(normalizeConditions('environment == "staging"')).toEqual([
      { type: "environment", params: { environment: "staging" } },
    ]);
    expect(normalizeConditions("environment: dev")).toEqual([
      { type: "environment", params: { environment: "dev" } },
    ]);
    expect(normalizeConditions("environment(prod)")).toEqual([
      { type: "environment", params: { environment: "prod" } },
    ]);
  });

  it("normalizes approval_exists condition strings", () => {
    expect(normalizeConditions("approval_exists")).toEqual([
      { type: "approval_exists", params: {} },
    ]);
    expect(normalizeConditions("approval_exists()")).toEqual([
      { type: "approval_exists", params: {} },
    ]);
    expect(normalizeConditions("approval_exists == true")).toEqual([
      { type: "approval_exists", params: {} },
    ]);
  });

  it("normalizes time_window condition strings", () => {
    expect(normalizeConditions("time_window")).toEqual([
      { type: "time_window", params: {} },
    ]);
    expect(normalizeConditions("time_window(9, 17)")).toEqual([
      { type: "time_window", params: { startHour: 9, endHour: 17 } },
    ]);
    expect(normalizeConditions("time_window(startHour=8, endHour=18)")).toEqual(
      [{ type: "time_window", params: { startHour: 8, endHour: 18 } }],
    );
    expect(normalizeConditions("time_window: 9-17")).toEqual([
      { type: "time_window", params: { startHour: 9, endHour: 17 } },
    ]);
  });

  it("normalizes custom condition strings", () => {
    expect(normalizeConditions("custom")).toEqual([
      { type: "custom", params: {} },
    ]);
  });

  it("normalizes compound conditions with && or AND", () => {
    expect(
      normalizeConditions("environment == 'production' && approval_exists"),
    ).toEqual([
      { type: "environment", params: { environment: "production" } },
      { type: "approval_exists", params: {} },
    ]);
    expect(
      normalizeConditions("time_window(9, 17) AND environment == 'production'"),
    ).toEqual([
      { type: "time_window", params: { startHour: 9, endHour: 17 } },
      { type: "environment", params: { environment: "production" } },
    ]);
  });

  it("normalizes structured objects and arrays", () => {
    expect(
      normalizeConditions({
        type: "environment",
        params: { environment: "production" },
      }),
    ).toEqual([{ type: "environment", params: { environment: "production" } }]);

    expect(
      normalizeConditions([
        { type: "environment", params: { environment: "production" } },
        { type: "approval_exists", params: {} },
      ]),
    ).toEqual([
      { type: "environment", params: { environment: "production" } },
      { type: "approval_exists", params: {} },
    ]);
  });

  it("normalizes JSON strings", () => {
    expect(
      normalizeConditions(
        JSON.stringify({
          type: "environment",
          params: { environment: "production" },
        }),
      ),
    ).toEqual([{ type: "environment", params: { environment: "production" } }]);
  });

  it("returns undefined for empty/null condition", () => {
    expect(normalizeConditions(undefined)).toBeUndefined();
    expect(normalizeConditions(null)).toBeUndefined();
    expect(normalizeConditions("")).toBeUndefined();
    expect(normalizeConditions("   ")).toBeUndefined();
  });

  it("normalizes unknown condition to unknown type (fail-closed)", () => {
    const res = normalizeConditions("unknown_custom_expression_xyz");
    expect(res).toBeDefined();
    expect(res![0].type).toBe("unknown");
  });
});

describe("PolicyCard Adapter Rule Mapping & Engine Enforcement", () => {
  const baseRequest: PolicyRequest = {
    tool: "deploy_tool",
    agentId: "agent-1",
    riskLevel: "high",
    scopes: ["*"],
  };

  it("maps PolicyCard condition to PolicyRule.conditions", () => {
    const policy: PolicyCard = {
      apiVersion: "policy.akcp.dev/v1alpha1",
      kind: "PolicyCard",
      metadata: { name: "conditional-policy" },
      appliesTo: { capabilities: ["deploy_tool"] },
      rules: [
        {
          effect: "allow",
          condition: "environment == 'production'",
        },
      ],
    };

    const rules = adaptPolicyCardToRules(policy);
    expect(rules).toHaveLength(1);
    expect(rules[0].conditions).toEqual([
      { type: "environment", params: { environment: "production" } },
    ]);
  });

  it("enforces environment condition at runtime", () => {
    const policy: PolicyCard = {
      apiVersion: "policy.akcp.dev/v1alpha1",
      kind: "PolicyCard",
      metadata: { name: "env-policy" },
      appliesTo: { capabilities: ["deploy_tool"] },
      rules: [
        {
          effect: "allow",
          condition: "environment == 'production'",
        },
      ],
    };

    const rules = adaptPolicyCardToRules(policy);

    const devDecision = evaluatePolicies(rules, {
      ...baseRequest,
      environment: "development",
    });
    expect(devDecision.effect).toBe("deny");

    const prodDecision = evaluatePolicies(rules, {
      ...baseRequest,
      environment: "production",
    });
    expect(prodDecision.effect).toBe("allow");
  });

  it("enforces approval_exists condition at runtime", () => {
    const policy: PolicyCard = {
      apiVersion: "policy.akcp.dev/v1alpha1",
      kind: "PolicyCard",
      metadata: { name: "approval-policy" },
      appliesTo: { capabilities: ["deploy_tool"] },
      rules: [
        {
          effect: "allow",
          condition: "approval_exists",
        },
      ],
    };

    const rules = adaptPolicyCardToRules(policy);

    const unapprovedDecision = evaluatePolicies(rules, baseRequest);
    expect(unapprovedDecision.effect).toBe("deny");

    const approvedDecision = evaluatePolicies(rules, {
      ...baseRequest,
      approvalToken: "valid-token-123",
    });
    expect(approvedDecision.effect).toBe("allow");
  });

  describe("time_window condition enforcement", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("enforces time_window condition at runtime", () => {
      const policy: PolicyCard = {
        apiVersion: "policy.akcp.dev/v1alpha1",
        kind: "PolicyCard",
        metadata: { name: "time-window-policy" },
        appliesTo: { capabilities: ["deploy_tool"] },
        rules: [
          {
            effect: "allow",
            condition: "time_window(startHour=9, endHour=17)",
          },
        ],
      };

      const rules = adaptPolicyCardToRules(policy);

      // Set time to 14:00 (within 9-17)
      vi.setSystemTime(new Date("2026-08-20T14:00:00"));
      const allowedDecision = evaluatePolicies(rules, baseRequest);
      expect(allowedDecision.effect).toBe("allow");

      // Set time to 20:00 (outside 9-17)
      vi.setSystemTime(new Date("2026-08-20T20:00:00"));
      const deniedDecision = evaluatePolicies(rules, baseRequest);
      expect(deniedDecision.effect).toBe("deny");
    });
  });

  it("fails closed (denies) for unknown condition type", () => {
    const policy: PolicyCard = {
      apiVersion: "policy.akcp.dev/v1alpha1",
      kind: "PolicyCard",
      metadata: { name: "unknown-cond-policy" },
      appliesTo: { capabilities: ["deploy_tool"] },
      rules: [
        {
          effect: "allow",
          condition: "invalid_condition_syntax_!@#",
        },
      ],
    };

    const rules = adaptPolicyCardToRules(policy);
    const decision = evaluatePolicies(rules, baseRequest);
    expect(decision.effect).toBe("deny");
  });

  it("maintains backward compatibility when no condition is declared", () => {
    const policy: PolicyCard = {
      apiVersion: "policy.akcp.dev/v1alpha1",
      kind: "PolicyCard",
      metadata: { name: "no-cond-policy" },
      appliesTo: { capabilities: ["deploy_tool"] },
      rules: [
        {
          effect: "allow",
        },
      ],
    };

    const rules = adaptPolicyCardToRules(policy);
    expect(rules[0].conditions).toBeUndefined();
    const decision = evaluatePolicies(rules, baseRequest);
    expect(decision.effect).toBe("allow");
  });

  it("handles deny rules with conditions", () => {
    const policy: PolicyCard = {
      apiVersion: "policy.akcp.dev/v1alpha1",
      kind: "PolicyCard",
      metadata: { name: "deny-cond-policy" },
      appliesTo: { capabilities: ["deploy_tool"] },
      rules: [
        {
          effect: "deny",
          condition: "environment == 'production'",
        },
      ],
    };

    const rules = adaptPolicyCardToRules(policy);
    expect(rules[0].effect).toBe("deny");
    expect(rules[0].conditions).toEqual([
      { type: "environment", params: { environment: "production" } },
    ]);
  });
});
