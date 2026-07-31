import { describe, it, expect } from "vitest";
import type { CapabilityRequest } from "../../capabilities/request.js";

describe("CapabilityRequest shape", () => {
  it("constructs a minimal request with only the required fields", () => {
    const request: CapabilityRequest = {
      requestId: "req-1",
      toolName: "send-email",
      sideEffect: "submit",
      payload: { to: "a@b.com" },
    };

    expect(request.requestId).toBe("req-1");
    expect(request.toolName).toBe("send-email");
    expect(request.sideEffect).toBe("submit");
    expect(request.payload).toEqual({ to: "a@b.com" });
    expect(request.agentId).toBeUndefined();
    expect(request.clientId).toBeUndefined();
    expect(request.apiKey).toBeUndefined();
    expect(request.sourceId).toBeUndefined();
  });

  it("accepts all optional fields when provided", () => {
    const request: CapabilityRequest = {
      requestId: "req-2",
      toolName: "read-file",
      sideEffect: "read",
      agentId: "agent-1",
      clientId: "client-1",
      payload: null,
      apiKey: "secret-key",
      sourceId: "source-1",
    };

    expect(request.agentId).toBe("agent-1");
    expect(request.clientId).toBe("client-1");
    expect(request.apiKey).toBe("secret-key");
    expect(request.sourceId).toBe("source-1");
  });

  it("supports each sideEffect literal", () => {
    const sideEffects: CapabilityRequest["sideEffect"][] = [
      "read",
      "write",
      "submit",
    ];

    for (const sideEffect of sideEffects) {
      const request: CapabilityRequest = {
        requestId: `req-${sideEffect}`,
        toolName: "generic-tool",
        sideEffect,
        payload: {},
      };
      expect(request.sideEffect).toBe(sideEffect);
    }
  });

  it("allows an arbitrary payload shape, including primitives and arrays", () => {
    const arrayPayloadRequest: CapabilityRequest = {
      requestId: "req-array",
      toolName: "bulk-op",
      sideEffect: "write",
      payload: [1, 2, 3],
    };
    const primitivePayloadRequest: CapabilityRequest = {
      requestId: "req-primitive",
      toolName: "ping",
      sideEffect: "read",
      payload: "just-a-string",
    };

    expect(arrayPayloadRequest.payload).toEqual([1, 2, 3]);
    expect(primitivePayloadRequest.payload).toBe("just-a-string");
  });
});
