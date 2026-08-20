import { describe, it, expect, vi } from "vitest";
import { MCPGateway, MCPGatewayError } from "../../capabilities/gateway.js";
import type { PolicyCard } from "../../policy/types.js";

describe("MCPGateway", () => {
  const rawPolicy = {
    apiVersion: "policy.akcp.dev/v1alpha1",
    kind: "PolicyCard",
    metadata: { name: "test-policy" },
    spec: {
      allowedTools: ["read_document", "create_document"],
      forbiddenTools: ["delete_document"],
      sideEffectRules: {
        read: "allow",
        write: "allow",
        submit: "deny",
      },
      approvalRequirements: [],
      piiHandling: "redact",
    },
  };

  const mockPolicy: PolicyCard = rawPolicy as unknown as PolicyCard;

  const gateway = new MCPGateway({
    policies: {
      "agent-1": mockPolicy,
    },
    defaultPolicy: undefined,
  });

  it("should block execution if no valid policy is found for agent", async () => {
    await expect(
      gateway.execute(
        {
          requestId: "123",
          toolName: "read_document",
          sideEffect: "read",
          agentId: "unknown-agent",
          payload: {},
        },
        async () => ({ success: true }),
      ),
    ).rejects.toThrowError(MCPGatewayError);
  });

  it("should allow execution for allowed tool", async () => {
    const result = await gateway.execute(
      {
        requestId: "123",
        toolName: "read_document",
        sideEffect: "read",
        agentId: "agent-1",
        payload: {},
      },
      async () => ({ success: true }),
    );

    expect(result.success).toBe(true);
  });

  it("should block execution for forbidden tool", async () => {
    await expect(
      gateway.execute(
        {
          requestId: "123",
          toolName: "delete_document",
          sideEffect: "write",
          agentId: "agent-1",
          payload: {},
        },
        async () => ({ success: true }),
      ),
    ).rejects.toThrowError(/Policy Violation/);
  });

  it("should block execution for denied sideEffect", async () => {
    await expect(
      gateway.execute(
        {
          requestId: "123",
          toolName: "create_document", // allowed tool
          sideEffect: "submit", // but submit sideEffect is denied
          agentId: "agent-1",
          payload: {},
        },
        async () => ({ success: true }),
      ),
    ).rejects.toThrowError(/Policy Violation/);
  });

  it("should sanitize PII output when piiHandling is redact", async () => {
    const result = await gateway.execute(
      {
        requestId: "123",
        toolName: "read_document",
        sideEffect: "read",
        agentId: "agent-1",
        payload: {},
      },
      async () => ({
        email: "john.doe@example.com",
        ssn: "123-45-6789",
        name: "John Doe",
      }),
    );

    expect(result.email).toBe("[REDACTED_EMAIL]");
    expect(result.ssn).toBe("[REDACTED_SSN]");
    expect(result.name).toBe("John Doe"); // Unaffected
  });

  it("should throw error when piiHandling is deny and PII is found", async () => {
    const strictGateway = new MCPGateway({
      policies: {
        "agent-2": {
          ...mockPolicy,
          spec: {
            ...mockPolicy.spec,
            piiHandling: "deny",
          },
        },
      },
    });

    await expect(
      strictGateway.execute(
        {
          requestId: "123",
          toolName: "read_document",
          sideEffect: "read",
          agentId: "agent-2",
          payload: {},
        },
        async () => ({
          email: "john.doe@example.com",
        }),
      ),
    ).rejects.toThrowError(/PII detected in output/);
  });

  describe("riskLevel-scoped policy rules", () => {
    // Regression test: MCPGateway used to hardcode riskLevel: "medium" for
    // every request, which made any policy rule scoped by risk level
    // silently unenforceable no matter what the caller passed.
    const riskScopedPolicy: PolicyCard = {
      apiVersion: "policy.akcp.dev/v1alpha1",
      kind: "PolicyCard",
      metadata: { name: "risk-scoped-policy" },
      appliesTo: { capabilities: ["*"], riskLevels: ["critical"] },
      rules: [{ effect: "deny" }],
    };

    const riskGateway = new MCPGateway({
      policies: { "agent-risk": riskScopedPolicy },
    });

    it("denies a request whose declared riskLevel matches the rule's scope", async () => {
      await expect(
        riskGateway.execute(
          {
            requestId: "123",
            toolName: "some_tool",
            sideEffect: "read",
            riskLevel: "critical",
            agentId: "agent-risk",
            payload: {},
          },
          async () => ({ success: true }),
        ),
      ).rejects.toThrowError(/Policy Violation/);
    });

    it("does not match the deny rule when the declared riskLevel is outside its scope", async () => {
      // This policy card declares only the risk-scoped V2 deny rule and no
      // `spec` — so once the rule fails to match, the engine's closed-world
      // default (deny when nothing matches) applies. The point of this test
      // is narrower: confirming the rule itself didn't fire for "low" (it
      // would throw a POLICY_VIOLATION reason naming the matched rule, not
      // the generic default-deny reason).
      await expect(
        riskGateway.execute(
          {
            requestId: "123",
            toolName: "some_tool",
            sideEffect: "read",
            riskLevel: "low",
            agentId: "agent-risk",
            payload: {},
          },
          async () => ({ success: true }),
        ),
      ).rejects.toThrowError(/No matching rule found\. Default: deny\./);
    });

    it("allows the request when riskLevel is outside scope and a permissive V1 spec exists", async () => {
      const permissiveGateway = new MCPGateway({
        policies: {
          "agent-risk-permissive": {
            ...riskScopedPolicy,
            spec: {
              allowedAgents: ["*"],
              allowedContextPacks: ["*"],
              allowedTools: ["*"],
              forbiddenTools: [],
              approvalRequirements: [],
              piiHandling: "deny",
              sideEffectRules: {
                read: "allow",
                write: "approval",
                submit: "approval",
              },
            },
          },
        },
      });

      const result = await permissiveGateway.execute(
        {
          requestId: "123",
          toolName: "some_tool",
          sideEffect: "read",
          riskLevel: "low",
          agentId: "agent-risk-permissive",
          payload: {},
        },
        async () => ({ success: true }),
      );
      expect(result.success).toBe(true);
    });
  });

  describe("HITL Approval Enforcement", () => {
    const approvalRequiredPolicy = {
      ...mockPolicy,
      spec: {
        ...mockPolicy.spec,
        allowedTools: ["restricted_tool"],
        approvalRequirements: ["restricted_tool"], // requires approval
      },
    };

    const mockApprovalStore = {
      generateToken: vi.fn().mockResolvedValue("mock-token-123"),
      validateAndConsume: vi.fn().mockResolvedValue(true),
      getPendingApprovals: vi.fn(),
      getAuditLogs: vi.fn(),
      approveToken: vi.fn(),
      revokeToken: vi.fn(),
    };

    const hitlGateway = new MCPGateway({
      policies: {
        "agent-hitl": approvalRequiredPolicy as unknown as PolicyCard,
      },
      approvalStore: mockApprovalStore,
    });

    it("should throw APPROVAL_REQUIRED and generate token if no token is provided", async () => {
      let error: any;
      try {
        await hitlGateway.execute(
          {
            requestId: "123",
            toolName: "restricted_tool",
            sideEffect: "write",
            agentId: "agent-hitl",
            payload: { someData: "test" },
          },
          async () => ({ success: true }),
        );
      } catch (err) {
        error = err;
      }
      expect(error).toBeInstanceOf(MCPGatewayError);
      expect(error.code).toBe("APPROVAL_REQUIRED");
      expect(error.data.approvalToken).toBe("mock-token-123");
      expect(mockApprovalStore.generateToken).toHaveBeenCalledWith(
        expect.any(String), // requestId
        "restricted_tool",
        expect.any(String), // hash
        "high",
        "write",
        "agent-hitl",
        expect.any(Object),
      );
    });

    it("should execute successfully if a valid _approvalToken is provided", async () => {
      mockApprovalStore.validateAndConsume.mockResolvedValueOnce(true);
      const result = await hitlGateway.execute(
        {
          requestId: "124",
          toolName: "restricted_tool",
          sideEffect: "write",
          agentId: "agent-hitl",
          payload: { someData: "test", _approvalToken: "valid-token" },
        },
        async () => ({ success: true }),
      );

      expect(result.success).toBe(true);
      expect(mockApprovalStore.validateAndConsume).toHaveBeenCalledWith(
        "valid-token",
        "restricted_tool",
        expect.any(String), // hash
        "agent-hitl",
      );
    });

    it("should block execution if an invalid _approvalToken is provided", async () => {
      mockApprovalStore.validateAndConsume.mockResolvedValueOnce(false);
      await expect(
        hitlGateway.execute(
          {
            requestId: "125",
            toolName: "restricted_tool",
            sideEffect: "write",
            agentId: "agent-hitl",
            payload: { someData: "test", _approvalToken: "invalid-token" },
          },
          async () => ({ success: true }),
        ),
      ).rejects.toThrowError(/Invalid, expired, or tampered approval token/);
    });
  });

  describe("Audit Log riskLevel propagation", () => {
    const mockAuditLog = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    };

    const auditGateway = new MCPGateway({
      policies: {
        "agent-audit": mockPolicy,
      },
      auditLogService: mockAuditLog,
    });

    it("should propagate custom riskLevel to audit log on allow", async () => {
      mockAuditLog.logEvent.mockClear();

      await auditGateway.execute(
        {
          requestId: "req-critical",
          toolName: "read_document",
          sideEffect: "read",
          agentId: "agent-audit",
          riskLevel: "critical",
          payload: {},
        },
        async () => ({ success: true }),
      );

      expect(mockAuditLog.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "policy.evaluate",
          decision: "allow",
          riskLevel: "critical",
        }),
      );
    });

    it("should propagate custom riskLevel to audit log on policy deny", async () => {
      mockAuditLog.logEvent.mockClear();

      await expect(
        auditGateway.execute(
          {
            requestId: "req-deny",
            toolName: "delete_document",
            sideEffect: "write",
            agentId: "agent-audit",
            riskLevel: "high",
            payload: {},
          },
          async () => ({ success: true }),
        ),
      ).rejects.toThrowError(/Policy Violation/);

      expect(mockAuditLog.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "policy.evaluate",
          decision: "deny",
          riskLevel: "high",
        }),
      );
    });

    it("should fallback to medium riskLevel in audit log when riskLevel is omitted", async () => {
      mockAuditLog.logEvent.mockClear();

      await auditGateway.execute(
        {
          requestId: "req-no-risk",
          toolName: "read_document",
          sideEffect: "read",
          agentId: "agent-audit",
          payload: {},
        },
        async () => ({ success: true }),
      );

      expect(mockAuditLog.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "policy.evaluate",
          decision: "allow",
          riskLevel: "medium",
        }),
      );
    });

    it("should propagate riskLevel to audit log when no valid policy is found", async () => {
      mockAuditLog.logEvent.mockClear();

      await expect(
        auditGateway.execute(
          {
            requestId: "req-unauth",
            toolName: "read_document",
            sideEffect: "read",
            agentId: "unknown-agent",
            riskLevel: "critical",
            payload: {},
          },
          async () => ({ success: true }),
        ),
      ).rejects.toThrowError(MCPGatewayError);

      expect(mockAuditLog.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "policy.evaluate",
          decision: "error",
          riskLevel: "critical",
        }),
      );
    });
  });
});
