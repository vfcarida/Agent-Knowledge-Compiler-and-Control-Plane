import { describe, it, expect } from "vitest";
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
});
