import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AKCPProfileServer } from "../server.js";
import type { AgentKnowledgeIR } from "@akcp/core";

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  return {
    McpServer: vi.fn().mockImplementation(() => ({
      resource: vi.fn(),
      tool: vi.fn(),
    })),
  };
});

describe("AKCPProfileServer", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let warnSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("should warn if no concepts are found in IR", () => {
    const ir = {
      bundleId: "test-bundle",
      concepts: [],
      capabilities: [],
      links: [],
      metadata: { createdAt: new Date().toISOString() },
    } as unknown as AgentKnowledgeIR;
    new AKCPProfileServer(ir);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("No concepts found in IR"),
    );
  });

  it("should warn if no tools are found in IR", () => {
    const ir = {
      bundleId: "test-bundle",
      concepts: [
        {
          conceptId: "doc-1",
          type: "skill",
          data: {},
          relations: [],
          frontmatter: {},
          body: "test",
        },
      ],
      capabilities: [],
      links: [],
      metadata: { createdAt: new Date().toISOString() },
    } as unknown as AgentKnowledgeIR;
    new AKCPProfileServer(ir);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("No tool capabilities found in IR"),
    );
  });

  it("should register resources for valid concepts", () => {
    const ir = {
      bundleId: "test-bundle",
      concepts: [
        {
          conceptId: "domain/skill",
          type: "skill",
          data: {},
          relations: [],
          frontmatter: { summary: "Test skill" },
          body: "Skill body",
        },
      ],
      capabilities: [],
      links: [],
      metadata: { createdAt: new Date().toISOString() },
    } as unknown as AgentKnowledgeIR;

    const server = new AKCPProfileServer(ir);
    const mcpInstance = server.getServerInstance();
    expect(mcpInstance.resource).toHaveBeenCalledWith(
      "domain-skill",
      "knowledge://test-bundle/domain/skill",
      expect.any(Object),
      expect.any(Function),
    );
  });

  it("should skip resources with path traversal", () => {
    const ir = {
      bundleId: "test-bundle",
      concepts: [
        {
          conceptId: "../domain/skill",
          type: "skill",
          data: {},
          relations: [],
          frontmatter: {},
          body: "Skill body",
        },
      ],
      capabilities: [],
      links: [],
      metadata: { createdAt: new Date().toISOString() },
    } as unknown as AgentKnowledgeIR;

    const server = new AKCPProfileServer(ir);
    const mcpInstance = server.getServerInstance();
    expect(mcpInstance.resource).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Skipping resource with invalid path traversal"),
    );
  });

  it("should register tools for valid capabilities", () => {
    const ir = {
      bundleId: "test-bundle",
      concepts: [],
      capabilities: [
        {
          id: "cap-1",
          kind: "tool",
          name: "test_tool",
          description: "A test tool",
          riskLevel: "low",
          sideEffects: ["none"],
        } as unknown,
      ],
      links: [],
      metadata: { createdAt: new Date().toISOString() },
    } as unknown as AgentKnowledgeIR;

    const server = new AKCPProfileServer(ir);
    const mcpInstance = server.getServerInstance();

    // The built-in read_document_chunk tool should be registered
    expect(mcpInstance.tool).toHaveBeenCalledWith(
      "read_document_chunk",
      expect.any(String),
      expect.any(Object),
      expect.any(Function),
    );

    // The IR capability tool should be registered
    expect(mcpInstance.tool).toHaveBeenCalledWith(
      "test_tool",
      "A test tool",
      expect.any(Object),
      expect.any(Function),
    );
  });
});
