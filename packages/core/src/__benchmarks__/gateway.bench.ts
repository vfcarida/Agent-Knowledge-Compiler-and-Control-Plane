import { bench, describe } from "vitest";
import { MCPGateway } from "../capabilities/gateway.js";
import type { PolicyCard } from "../policy/types.js";

const policy: PolicyCard = {
  apiVersion: "policy.akcp.dev/v1alpha1",
  kind: "PolicyCard",
  metadata: { name: "bench-policy" },
  spec: {
    allowedTools: ["*"],
    allowedAgents: ["*"],
    allowedContextPacks: ["*"],
    forbiddenTools: [],
    sideEffectRules: { read: "allow", write: "allow", submit: "allow" },
    approvalRequirements: [],
    piiHandling: "deny",
  },
  rules: [{ effect: "allow" }],
};

const gateway = new MCPGateway({
  policies: { "bench-agent": policy },
});

describe("MCPGateway Benchmarks", () => {
  bench("gateway execute (allow, no audit)", async () => {
    await gateway.execute(
      {
        requestId: "bench-req-1",
        agentId: "bench-agent",
        toolName: "akcp.read_document",
        sideEffect: "read",
        payload: {},
      },
      async () => ({ data: "result" }),
    );
  });

  bench("gateway execute (policy evaluation)", async () => {
    const complexPolicy: PolicyCard = {
      apiVersion: "policy.akcp.dev/v1alpha1",
      kind: "PolicyCard",
      metadata: { name: "complex" },
      spec: {
        allowedAgents: ["*"],
        allowedContextPacks: ["*"],
        allowedTools: ["akcp.read_document", "akcp.list", "akcp.search"],
        forbiddenTools: ["akcp.delete", "akcp.admin"],
        sideEffectRules: { read: "allow", write: "approval", submit: "deny" },
        approvalRequirements: [],
        piiHandling: "redact",
        evidenceRequirements: [],
      },
    };

    const gw = new MCPGateway({
      policies: { "bench-agent": complexPolicy },
    });

    await gw.execute(
      {
        requestId: "bench-req-2",
        agentId: "bench-agent",
        toolName: "akcp.read_document",
        sideEffect: "read",
        payload: {},
      },
      async () => ({ data: "result" }),
    );
  });
});
