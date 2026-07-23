import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpSecurityGateway } from "../../privacy/http-security-gateway.js";

describe("HttpSecurityGateway", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should successfully redact text via external gateway", async () => {
    const mockResponse = {
      redactedText: "Hello <REDACTED_PERSON>",
      findings: [{ type: "PERSON", start: 6, end: 11, score: 0.99 }],
      blocked: false,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const gateway = new HttpSecurityGateway("http://localhost:8080/redact", "<REDACTED_{class}>");
    const result = await gateway.redact("Hello Alice", { mode: "redact" });

    expect(result.redactedText).toBe("Hello <REDACTED_PERSON>");
    expect(result.findings.length).toBe(1);
    expect(result.blocked).toBe(false);
    expect(fetch).toHaveBeenCalledWith("http://localhost:8080/redact", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("Hello Alice")
    }));
  });

  it("should throw an error if the gateway is unreachable or returns a non-200 status", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const gateway = new HttpSecurityGateway("http://localhost:8080/redact");

    await expect(gateway.redact("Hello Alice", { mode: "redact" }))
      .rejects.toThrow(/Failed to reach Security Gateway/);
  });
});
