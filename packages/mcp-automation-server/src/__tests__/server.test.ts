import { describe, it, expect, vi, beforeEach } from "vitest";
import { AKCPAutomationServer } from "../server.js";
import { OKFDocumentService } from "@akcp/core";

// Mock the global approvalStore that's instantiated inside server.ts
vi.mock("../approval/approval-store.js", () => {
  return {
    ApprovalStore: vi.fn().mockImplementation(() => ({
      generateToken: vi.fn().mockResolvedValue("mock-token"),
      validateAndConsume: vi.fn().mockResolvedValue(true),
      getPendingApprovals: vi.fn().mockResolvedValue([]),
      revokeToken: vi.fn().mockResolvedValue(true),
      approveToken: vi.fn().mockResolvedValue(true),
    })),
  };
});

vi.mock("../approval/redis-store.js", () => {
  return {
    RedisApprovalStore: vi.fn(),
  };
});

// Mock BrowserOrchestrator
vi.mock("../automation/browser-orchestrator.js", () => {
  return {
    BrowserOrchestrator: vi.fn().mockImplementation(() => ({
      orchestrate: vi.fn().mockResolvedValue({
        success: true,
        company: "Test Co",
        jobTitle: "Dev",
        platform: "LinkedIn",
        submittedAt: new Date().toISOString(),
      }),
    })),
  };
});

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  return {
    McpServer: vi.fn().mockImplementation(() => ({
      tool: vi.fn(),
    })),
  };
});

vi.mock("@akcp/core", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(actual as any),
    MCPGateway: vi.fn().mockImplementation(() => ({
      execute: vi.fn().mockImplementation(async (_ctx, fn) => {
        const data = await fn();
        return { data, durationMs: 10 };
      }),
    })),
    withToolTracing: vi
      .fn()
      .mockImplementation(async (_name, _version, _reqId, fn) => {
        return await fn();
      }),
  };
});

// Mock the doc service
const mockDocService = {
  getCareerContext: vi.fn().mockResolvedValue({
    preferences: [{ frontmatter: { roles: ["Software Engineer"] } }],
  }),
  createDocument: vi.fn().mockResolvedValue({}),
} as unknown as OKFDocumentService;

describe("AKCPAutomationServer", () => {
  let server: AKCPAutomationServer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mcpServerMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new AKCPAutomationServer(mockDocService);
    mcpServerMock = server.getServerInstance();
  });

  it("should register all required tools", () => {
    const registeredTools = mcpServerMock.tool.mock.calls.map(
      (call: unknown[]) => call[0],
    );
    expect(registeredTools).toContain("preview_application");
    expect(registeredTools).toContain("prepare_application");
    expect(registeredTools).toContain("confirm_application_submission");
    expect(registeredTools).toContain("list_pending_approvals");
    expect(registeredTools).toContain("revoke_approval");
    expect(registeredTools).toContain("approve_pending_token");
  });

  describe("preview_application", () => {
    it("should return a successful preview", async () => {
      const toolCall = mcpServerMock.tool.mock.calls.find(
        (call: unknown[]) => call[0] === "preview_application",
      );
      const handler = toolCall[3];

      const result = await handler({
        jobUrl: "https://linkedin.com/jobs/123",
        _agentId: "agent-1",
      });

      expect(result.isError).toBeUndefined(); // or false
      expect(result.content[0].type).toBe("text");
      const text = JSON.parse(result.content[0].text);
      expect(text.data.platform).toBe("LinkedIn");
    });
  });

  describe("prepare_application", () => {
    it("should return an approval token", async () => {
      const toolCall = mcpServerMock.tool.mock.calls.find(
        (call: unknown[]) => call[0] === "prepare_application",
      );
      const handler = toolCall[3];

      const result = await handler({
        jobUrl: "https://linkedin.com/jobs/123",
        _agentId: "agent-1",
      });

      expect(result.isError).toBeUndefined();
      const text = JSON.parse(result.content[0].text);
      expect(text.data.approvalToken).toBe("mock-token");
    });
  });

  describe("list_pending_approvals", () => {
    it("should list pending approvals", async () => {
      const toolCall = mcpServerMock.tool.mock.calls.find(
        (call: unknown[]) => call[0] === "list_pending_approvals",
      );
      const handler = toolCall[3];

      const result = await handler({ _agentId: "agent-1" });

      expect(result.isError).toBeUndefined();
      const text = JSON.parse(result.content[0].text);
      expect(text.data.pending).toEqual([]);
    });
  });
});
