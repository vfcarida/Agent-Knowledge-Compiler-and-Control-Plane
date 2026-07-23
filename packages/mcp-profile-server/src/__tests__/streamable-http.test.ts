import { describe, it, expect, vi } from "vitest";
import { createStreamableHttpTransport } from "../transport.js";

vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => {
  return {
    StreamableHTTPServerTransport: vi.fn().mockImplementation(() => ({
      handleRequest: vi.fn(),
      start: vi.fn(),
      close: vi.fn(),
      send: vi.fn(),
    })),
  };
});

describe("Streamable HTTP Transport", () => {
  it("should create transport with secure config", () => {
    const config = { auth: { jwt: { secret: "test" } } };
    const transport = createStreamableHttpTransport(config);
    expect(transport).toBeDefined();
    expect(transport.handleRequest).toBeDefined();
  });

  it("should throw if insecure without flag", () => {
    expect(() => createStreamableHttpTransport({ auth: undefined })).toThrow();
  });
});
