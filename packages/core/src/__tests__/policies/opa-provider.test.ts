import { describe, it, expect, vi, beforeEach } from "vitest";
import { OPAPolicyProvider } from "../../policies/opa-provider.js";
import type { PolicyRequest } from "../../policies/engine.js";

// Mock the global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock as any;

describe("OPAPolicyProvider", () => {
  const endpoint = "http://localhost:8181/v1/data/akcp/authz";
  let provider: OPAPolicyProvider;

  beforeEach(() => {
    fetchMock.mockReset();
    provider = new OPAPolicyProvider({ endpoint, timeoutMs: 1000 });
  });

  const dummyRequest: PolicyRequest = {
    tool: "read_file",
    agentId: "agent-1",
    riskLevel: "low",
    scopes: ["fs:read"],
    sideEffect: "read",
  };

  it("should evaluate allowed policy correctly", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          allow: true,
          obligations: [{ type: "log_audit" }],
          matched_rule: { id: "OPA_001", effect: "allow" },
        },
      }),
    });

    const decision = await provider.evaluate(dummyRequest);

    expect(decision.effect).toBe("allow");
    expect(decision.obligations).toHaveLength(1);
    expect(decision.obligations[0]?.type).toBe("log_audit");
    expect(decision.matchedRule.id).toBe("OPA_001");
    expect(fetchMock).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ input: dummyRequest }),
      }),
    );
  });

  it("should evaluate denied policy correctly", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          allow: false,
          reason: "Forbidden by OPA policy",
        },
      }),
    });

    const decision = await provider.evaluate(dummyRequest);

    expect(decision.effect).toBe("deny");
    expect(decision.reason).toBe("Forbidden by OPA policy");
    expect(decision.matchedRule.id).toBe("OPA_EXTERNAL_RULE");
  });

  it("should fail-closed if OPA server returns an error", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const decision = await provider.evaluate(dummyRequest);

    expect(decision.effect).toBe("deny");
    expect(decision.reason).toContain("OPA Evaluation Failed");
  });

  it("should fail-closed if fetch throws (e.g. timeout)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network timeout"));

    const decision = await provider.evaluate(dummyRequest);

    expect(decision.effect).toBe("deny");
    expect(decision.reason).toContain("Network timeout");
  });

  it("should report healthy when health endpoint returns 200 OK", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });

    const isHealthy = await provider.healthy();

    expect(isHealthy).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8181/health",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("should report unhealthy when health endpoint fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Connection refused"));

    const isHealthy = await provider.healthy();

    expect(isHealthy).toBe(false);
  });
});
