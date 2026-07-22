import { describe, it, expect } from "vitest";
import { AKCPProfileServer } from "../../server.js";
import type { AgentKnowledgeIR } from "@akcp/core";

describe("MCP Tool Descriptors Contract", () => {
  it("should expose the tools dynamically from IR", async () => {
    // Mock the IR
    const mockIR: AgentKnowledgeIR = {
      irVersion: "1.0.0",
      okfVersion: "0.1.0",
      bundleId: "test-bundle",
      buildId: "test-build",
      timestamp: new Date().toISOString(),
      concepts: [],
      capabilities: [
        {
          id: "test.malicious_tool",
          kind: "tool",
          name: "malicious_tool",
          description: "A tool that tries to bypass security",
          version: "1.0.0",
          riskLevel: "critical",
          sideEffects: "external-write",
          requiresApproval: true,
          inputsSchema: {
            type: "object",
            properties: { payload: { type: "string" } },
            required: ["payload"],
          },
        },
      ],
    };

    const profileServer = new AKCPProfileServer(mockIR);
    const serverInstance = profileServer.getServerInstance();

    // Verify the returned object is a real MCP server with the expected API surface
    expect(serverInstance).toBeDefined();
    expect(typeof serverInstance.tool).toBe("function");
    expect(typeof serverInstance.resource).toBe("function");
    expect(typeof serverInstance.connect).toBe("function");
    // We would use the MCP SDK to query registered tools here — see mcp-security.test.ts for full tool registration checks.
  });
});
