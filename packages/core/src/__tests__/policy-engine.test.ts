import { describe, it, expect } from "vitest";
import {
  evaluatePolicies,
  PolicyRule,
  PolicyRequest,
} from "../policies/engine.js";

describe("PolicyEngine", () => {
  const baseRequest: PolicyRequest = {
    tool: "test_tool",
    agentId: "agent-1",
    riskLevel: "low",
    scopes: [],
  };

  it("applies highest priority rule first", () => {
    const rules: PolicyRule[] = [
      {
        id: "rule-1",
        priority: 10,
        effect: "allow",
        match: { tools: ["test_tool"] },
      },
      {
        id: "rule-2",
        priority: 5,
        effect: "deny",
        match: { tools: ["test_tool"] },
      },
    ];
    const decision = evaluatePolicies(rules, baseRequest);
    expect(decision.effect).toBe("deny");
    expect(decision.matchedRule.id).toBe("rule-2");
  });

  it("default denies when no rule matches", () => {
    const rules: PolicyRule[] = [
      {
        id: "rule-1",
        priority: 10,
        effect: "allow",
        match: { tools: ["other_tool"] },
      },
    ];
    const decision = evaluatePolicies(rules, baseRequest);
    expect(decision.effect).toBe("deny");
    expect(decision.matchedRule.id).toBe("DEFAULT_DENY");
  });

  it("supports glob patterns in tool matching", () => {
    const rules: PolicyRule[] = [
      {
        id: "rule-1",
        priority: 10,
        effect: "allow",
        match: { tools: ["read_*"] },
      },
    ];
    const decision1 = evaluatePolicies(rules, {
      ...baseRequest,
      tool: "read_database",
    });
    expect(decision1.effect).toBe("allow");

    const decision2 = evaluatePolicies(rules, {
      ...baseRequest,
      tool: "write_database",
    });
    expect(decision2.effect).toBe("deny");
  });

  it("evaluates conditions before applying rule", () => {
    const rules: PolicyRule[] = [
      {
        id: "conditional-allow",
        priority: 10,
        effect: "allow",
        match: { tools: ["admin_tool"] },
        conditions: [
          { type: "environment", params: { environment: "production" } },
        ],
      },
      {
        id: "fallback-deny",
        priority: 20,
        effect: "deny",
        match: { tools: ["admin_tool"] },
      },
    ];

    const decisionDev = evaluatePolicies(rules, {
      ...baseRequest,
      tool: "admin_tool",
      environment: "development",
    });
    expect(decisionDev.effect).toBe("deny");
    expect(decisionDev.matchedRule.id).toBe("fallback-deny");

    const decisionProd = evaluatePolicies(rules, {
      ...baseRequest,
      tool: "admin_tool",
      environment: "production",
    });
    expect(decisionProd.effect).toBe("allow");
    expect(decisionProd.matchedRule.id).toBe("conditional-allow");
  });

  it("collects obligations from matching allow rule", () => {
    const rules: PolicyRule[] = [
      {
        id: "rule-1",
        priority: 10,
        effect: "allow",
        match: { tools: ["test_tool"] },
        obligations: [{ type: "require_approval" }, { type: "log_audit" }],
      },
    ];
    const decision = evaluatePolicies(rules, baseRequest);
    expect(decision.effect).toBe("allow");
    expect(decision.obligations).toHaveLength(2);
    expect(decision.obligations.map((o) => o.type)).toContain(
      "require_approval",
    );
    expect(decision.obligations.map((o) => o.type)).toContain("log_audit");
  });

  it("deny rule at priority 0 overrides allow at priority 1", () => {
    const rules: PolicyRule[] = [
      {
        id: "rule-allow",
        priority: 1,
        effect: "allow",
        match: { tools: ["*"] },
      },
      {
        id: "rule-deny",
        priority: 0,
        effect: "deny",
        match: { tools: ["restricted_tool"] },
      },
    ];

    const decision1 = evaluatePolicies(rules, {
      ...baseRequest,
      tool: "normal_tool",
    });
    expect(decision1.effect).toBe("allow");

    const decision2 = evaluatePolicies(rules, {
      ...baseRequest,
      tool: "restricted_tool",
    });
    expect(decision2.effect).toBe("deny");
    expect(decision2.matchedRule.id).toBe("rule-deny");
  });
});

import { evaluatePoliciesWithTrace } from "../policies/engine.js";

describe("evaluatePoliciesWithTrace", () => {
  it("traces a successful evaluation", () => {
    const rules: PolicyRule[] = [
      {
        id: "r1",
        priority: 10,
        effect: "allow",
        match: { tools: ["tool1"] },
        obligations: [],
      },
      {
        id: "r2",
        priority: 20,
        effect: "deny",
        match: { tools: ["tool1"] },
      },
    ];

    const req = {
      tool: "tool1",
      agentId: "agent1",
      riskLevel: "low",
      scopes: [],
    };
    const { decision, trace } = evaluatePoliciesWithTrace(rules, req);

    expect(decision.effect).toBe("allow");
    expect(trace.evaluatedRules.length).toBe(2);
    expect(trace.conflicts.length).toBe(1);
    expect(trace.conflicts[0].allowRule.id).toBe("r1");
    expect(trace.conflicts[0].denyRule.id).toBe("r2");
  });

  it("traces a default deny", () => {
    const { decision, trace } = evaluatePoliciesWithTrace([], {
      tool: "tool",
      agentId: "agent",
      riskLevel: "low",
      scopes: [],
    });
    expect(decision.effect).toBe("deny");
    expect(trace.evaluatedRules.length).toBe(0);
  });
});
