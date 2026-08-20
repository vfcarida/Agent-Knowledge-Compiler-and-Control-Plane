import { describe, it, expect } from "vitest";
import { extractGatewayPolicies } from "../../policy/extract-gateway-policies.js";
import type { AgentKnowledgeIR } from "../../ir/types.js";
import type { PolicyCard } from "../../policy/types.js";

describe("extractGatewayPolicies", () => {
  it("should return empty object when ir or ir.policies is missing", () => {
    expect(extractGatewayPolicies(undefined)).toEqual({});
    expect(extractGatewayPolicies(null)).toEqual({});
    expect(extractGatewayPolicies({} as AgentKnowledgeIR)).toEqual({});
    expect(
      extractGatewayPolicies({
        irVersion: "1.0.0",
        okfVersion: "0.1.0",
        bundleId: "test",
        buildId: "bld_1",
        timestamp: "2026-07-08T00:00:00Z",
        concepts: [],
      }),
    ).toEqual({});
  });

  it("should extract valid PolicyCard objects keyed by agentId or name", () => {
    const customCard: PolicyCard = {
      apiVersion: "policy.akcp.dev/v1alpha1",
      kind: "PolicyCard",
      metadata: {
        name: "custom-agent-policy",
        version: "1.0.0",
      },
      spec: {
        allowedAgents: ["agent-alpha"],
        allowedContextPacks: ["*"],
        allowedTools: ["read_doc"],
        forbiddenTools: ["write_doc"],
        approvalRequirements: [],
        piiHandling: "redact",
      },
    };

    const ir: AgentKnowledgeIR = {
      irVersion: "1.0.0",
      okfVersion: "0.1.0",
      bundleId: "test",
      buildId: "bld_1",
      timestamp: "2026-07-08T00:00:00Z",
      concepts: [],
      policies: {
        "agent-alpha": customCard,
        nonPolicyMetadata: "ignored-string",
        invalidPolicyObject: { notA: "valid-policy" },
      },
    };

    const extracted = extractGatewayPolicies(ir);
    expect(extracted["agent-alpha"]).toBeDefined();
    expect(extracted["agent-alpha"]?.metadata?.name).toBe(
      "custom-agent-policy",
    );
    expect(extracted["agent-alpha"]?.spec?.allowedTools).toEqual(["read_doc"]);
    expect(extracted["nonPolicyMetadata"]).toBeUndefined();
    expect(extracted["invalidPolicyObject"]).toBeUndefined();
  });

  it("should synthesize a default PolicyCard from top-level organizational defaults", () => {
    const ir: AgentKnowledgeIR = {
      irVersion: "1.0.0",
      okfVersion: "0.1.0",
      bundleId: "test",
      buildId: "bld_1",
      timestamp: "2026-07-08T00:00:00Z",
      concepts: [],
      policies: {
        defaultAutonomyLevel: "advise",
        piiHandling: "redact",
        disableDangerousTools: true,
        requireApprovalFor: ["exec_cmd", "drop_table"],
      },
    };

    const extracted = extractGatewayPolicies(ir);
    expect(extracted["default"]).toBeDefined();
    expect(extracted["default"]?.spec?.approvalRequirements).toEqual([
      "exec_cmd",
      "drop_table",
    ]);
    expect(extracted["default"]?.spec?.piiHandling).toBe("redact");
  });

  it("should not override an explicit 'default' PolicyCard with synthesis", () => {
    const explicitDefault: PolicyCard = {
      apiVersion: "policy.akcp.dev/v1alpha1",
      kind: "PolicyCard",
      metadata: {
        name: "explicit-default",
      },
      spec: {
        allowedAgents: ["*"],
        allowedContextPacks: ["*"],
        allowedTools: ["custom_tool"],
        forbiddenTools: [],
        approvalRequirements: [],
        piiHandling: "deny",
      },
    };

    const ir: AgentKnowledgeIR = {
      irVersion: "1.0.0",
      okfVersion: "0.1.0",
      bundleId: "test",
      buildId: "bld_1",
      timestamp: "2026-07-08T00:00:00Z",
      concepts: [],
      policies: {
        default: explicitDefault,
        defaultAutonomyLevel: "advise",
        piiHandling: "redact",
      },
    };

    const extracted = extractGatewayPolicies(ir);
    expect(extracted["default"]?.metadata?.name).toBe("explicit-default");
    expect(extracted["default"]?.spec?.allowedTools).toEqual(["custom_tool"]);
  });
});
