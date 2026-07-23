import { describe, it, expect, vi, beforeEach } from "vitest";
import { CedarPolicyProvider } from "../../policies/cedar-provider.js";
import type { PolicyRequest } from "../../policies/engine.js";

const fetchMock = vi.fn();
global.fetch = fetchMock as any;

describe("CedarPolicyProvider", () => {
  const endpoint = "http://localhost:8080/v1/is_authorized";
  let provider: CedarPolicyProvider;

  beforeEach(() => {
    fetchMock.mockReset();
    provider = new CedarPolicyProvider({ endpoint, timeoutMs: 1000 });
  });

  const dummyRequest: PolicyRequest = {
    tool: "write_db",
    agentId: "agent-2",
    riskLevel: "high",
    scopes: ["db:write"],
    sideEffect: "write",
  };

  it("should evaluate allowed policy correctly", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        decision: "Allow",
        obligations: [{ type: "require_approval" }],
        diagnostics: {
          reason: ["Policy_1"],
        },
      }),
    });

    const decision = await provider.evaluate(dummyRequest);

    expect(decision.effect).toBe("allow");
    expect(decision.obligations).toHaveLength(1);
    expect(decision.obligations[0]?.type).toBe("require_approval");
    expect(decision.reason).toBe("Policy_1");
    expect(decision.matchedRule.id).toBe("CEDAR_EXTERNAL_RULE");

    // Verify the mapped request structure
    expect(fetchMock).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"principal":"User::\\"agent-2\\""'),
      }),
    );
  });

  it("should evaluate denied policy correctly", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        decision: "Deny",
        diagnostics: {
          reason: ["Policy_2_Explicit_Deny"],
        },
      }),
    });

    const decision = await provider.evaluate(dummyRequest);

    expect(decision.effect).toBe("deny");
    expect(decision.reason).toBe("Policy_2_Explicit_Deny");
    expect(decision.matchedRule.effect).toBe("deny");
  });

  it("should fail-closed if Cedar server returns an error", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    const decision = await provider.evaluate(dummyRequest);

    expect(decision.effect).toBe("deny");
    expect(decision.reason).toContain("Cedar Evaluation Failed");
  });

  it("should fail-closed if fetch throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network Error"));

    const decision = await provider.evaluate(dummyRequest);

    expect(decision.effect).toBe("deny");
    expect(decision.reason).toContain("Network Error");
  });

  it("should report healthy when health endpoint returns 200 OK", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });

    const isHealthy = await provider.healthy();

    expect(isHealthy).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/health",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });
});
