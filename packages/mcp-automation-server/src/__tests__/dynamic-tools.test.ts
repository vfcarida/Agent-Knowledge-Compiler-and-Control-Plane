import { describe, it, expect, vi, beforeEach } from "vitest";
import { AKCPAutomationServer } from "../server.js";
import type { OKFDocumentService, AgentKnowledgeIR } from "@akcp/core";

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

vi.mock("../automation/browser-orchestrator.js", () => {
  return {
    BrowserOrchestrator: vi.fn().mockImplementation(() => ({
      orchestrate: vi.fn().mockResolvedValue({ success: true }),
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
    ...(actual as any),
    MCPGateway: vi.fn().mockImplementation(() => ({
      execute: vi.fn().mockImplementation(async (_ctx, fn) => {
        const data = await fn();
        return { data, durationMs: 15 };
      }),
    })),
    withToolTracing: vi
      .fn()
      .mockImplementation(async (_name, _version, _reqId, fn) => {
        return await fn();
      }),
  };
});

const mockDocService = {
  getCareerContext: vi.fn().mockResolvedValue({
    preferences: [],
  }),
  createDocument: vi.fn().mockResolvedValue({}),
} as unknown as OKFDocumentService;

describe("AKCPAutomationServer Dynamic Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers dynamic tools when initialized with an AgentKnowledgeIR", async () => {
    const mockIR: AgentKnowledgeIR = {
      irVersion: "0.1.0",
      okfVersion: "0.1.0",
      bundleId: "it-ops-bundle",
      buildId: "build-123",
      timestamp: new Date().toISOString(),
      concepts: [],
      capabilities: [
        {
          id: "restart_service_cap",
          name: "restart_service",
          kind: "tool",
          version: "1.0.0",
          description: "Restarts a production microservice",
          riskLevel: "critical",
          sideEffects: "external-submit",
          requiresApproval: true,
        },
        {
          id: "check_health_cap",
          name: "check_service_health",
          kind: "tool",
          version: "1.0.0",
          description: "Checks service health status",
          riskLevel: "low",
          sideEffects: "local-read",
          requiresApproval: false,
        },
      ],
      policies: {},
    };

    const server = new AKCPAutomationServer(
      mockDocService,
      { policies: {} },
      mockIR,
    );

    const mcpServerMock: any = server.getServerInstance();

    const registeredTools = mcpServerMock.tool.mock.calls.map(
      (call: unknown[]) => call[0],
    );

    expect(registeredTools).toContain("restart_service");
    expect(registeredTools).toContain("check_service_health");

    // Execute dynamic tool handler
    const toolCall = mcpServerMock.tool.mock.calls.find(
      (call: unknown[]) => call[0] === "restart_service",
    );
    expect(toolCall).toBeDefined();

    const handler = toolCall[3];
    const result = await handler({
      params: { serviceName: "payment-gateway" },
      _agentId: "ops-bot",
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.data.message).toContain(
      "Generic execution for restart_service",
    );
    expect(parsed.data.params.serviceName).toBe("payment-gateway");
  });

  it("supports programmatic registerAction with custom handler", async () => {
    const server = new AKCPAutomationServer(mockDocService);

    const mcpServerMock: any = server.getServerInstance();

    const customHandler = vi.fn().mockResolvedValue({
      success: true,
      data: { customOutput: 42 },
    });

    server.registerAction({
      id: "custom_db_vacuum",
      description: "Cleans up dead tuples",
      riskLevel: "medium",
      parameters: {} as any,
      handler: customHandler,
    });

    const registeredTools = mcpServerMock.tool.mock.calls.map(
      (call: unknown[]) => call[0],
    );
    expect(registeredTools).toContain("custom_db_vacuum");

    const toolCall = mcpServerMock.tool.mock.calls.find(
      (call: unknown[]) => call[0] === "custom_db_vacuum",
    );
    const handler = toolCall[3];
    const result = await handler({
      params: { tableName: "orders" },
      _agentId: "db-admin",
    });

    expect(customHandler).toHaveBeenCalledWith(
      { tableName: "orders" },
      expect.objectContaining({ agentId: "db-admin" }),
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.data.customOutput).toBe(42);
  });
});
