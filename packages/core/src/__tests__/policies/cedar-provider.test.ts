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

  it("should report unhealthy when health endpoint fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Timeout"));

    const isHealthy = await provider.healthy();

    expect(isHealthy).toBe(false);
  });

  it("should fail-closed when Cedar returns an empty or invalid result", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ decision: null }),
    });

    const decision = await provider.evaluate(dummyRequest);

    expect(decision.effect).toBe("deny");
    expect(decision.reason).toContain(
      "Cedar returned an empty or invalid result",
    );
  });

  it("should fallback to default reasons when diagnostics omit reasons", async () => {
    // Case A: Allow without diagnostics.reason
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ decision: "Allow" }),
    });

    const allowDecision = await provider.evaluate(dummyRequest);
    expect(allowDecision.effect).toBe("allow");
    expect(allowDecision.reason).toBe("Allowed by Cedar");

    // Case B: Deny without diagnostics.reason
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ decision: "Deny" }),
    });

    const denyDecision = await provider.evaluate(dummyRequest);
    expect(denyDecision.effect).toBe("deny");
    expect(denyDecision.reason).toBe("Denied by Cedar");
  });

  it("should support explain and reload lifecycles safely", async () => {
    const trace = await provider.explain(dummyRequest);
    expect(trace).toBeNull();

    await expect(
      provider.reload({ type: "bundle", path: "/tmp/cedar" }),
    ).resolves.toBeUndefined();
  });
});
