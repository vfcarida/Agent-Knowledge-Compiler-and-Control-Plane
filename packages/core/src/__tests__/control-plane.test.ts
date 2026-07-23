import { describe, it, expect, beforeEach } from "vitest";
import { MCPGateway } from "../capabilities/gateway.js";
import { InMemoryAuditLogService } from "../infrastructure/audit-log.js";
import type { IApprovalStore, PendingApproval } from "../capabilities/approval-store.js";
import type { PolicyCard } from "../policy/types.js";
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
import crypto from "crypto";

class MockApprovalStore implements IApprovalStore {
  private approvals: PendingApproval[] = [];
  
  async generateToken(
    requestId: string,
    capabilityId: string,
    payloadHash: string,
    riskLevel: string,
    sideEffectLevel: string,
    requestedBy: string,
    metadata?: Record<string, unknown>,
    ttlMs?: number
  ): Promise<string> {
    const token = "mock-token-123";
    this.approvals.push({
      token,
      requestId,
      capabilityId,
      payloadHash,
      riskLevel,
      sideEffectLevel,
      requestedBy,
      createdAt: Date.now(),
      expiresAt: Date.now() + (ttlMs || 60000),
      status: "PENDING",
      auditEventIds: [],
      metadata
    });
    return token;
  }

  async getPendingApprovals(): Promise<PendingApproval[]> {
    return this.approvals;
  }
  
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  async getAuditLogs(limit?: number): Promise<any[]> {
    return [];
  }

  async approveToken(token: string, actorIdentity?: string): Promise<boolean> {
    const app = this.approvals.find(a => a.token === token);
    if (app && app.status === "PENDING") {
      app.status = "APPROVED";
      app.approvedBy = actorIdentity;
      return true;
    }
    return false;
  }

  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  async validateAndConsume(token: string, capabilityId: string, payloadHash: string, actorIdentity?: string): Promise<boolean> {
    const app = this.approvals.find(a => a.token === token);
    if (app && app.status === "APPROVED" && app.capabilityId === capabilityId && app.payloadHash === payloadHash) {
      app.status = "CONSUMED";
      app.consumedAt = Date.now();
      return true;
    }
    return false;
  }

  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  async revokeToken(token: string, actorIdentity?: string): Promise<boolean> {
    const app = this.approvals.find(a => a.token === token);
    if (app && app.status === "PENDING") {
      app.status = "REVOKED";
      return true;
    }
    return false;
  }
}

describe("Control Plane & Runtime Governance", () => {
  let auditLog: InMemoryAuditLogService;
  let approvalStore: MockApprovalStore;
  let gateway: MCPGateway;

  const policyAllowAll: PolicyCard = {
    metadata: { name: "allow-all" },
    appliesTo: { capabilities: ["*"] },
    rules: [{ effect: "allow" }]
  };

  const policyDenyAll: PolicyCard = {
    metadata: { name: "deny-all" },
    appliesTo: { capabilities: ["*"] },
    rules: [{ effect: "deny" }]
  };

  const policyRequiresApproval: PolicyCard = {
    metadata: { name: "require-approval" },
    appliesTo: { capabilities: ["akcp.external_submit"] },
    rules: [{ effect: "require_approval" }]
  };

  beforeEach(() => {
    auditLog = new InMemoryAuditLogService();
    approvalStore = new MockApprovalStore();
  });

  it("should allow execution and emit policy-allow audit event", async () => {
    gateway = new MCPGateway({
      policies: { "agent-1": policyAllowAll },
      auditLogService: auditLog
    });

    const result = await gateway.execute(
      { agentId: "agent-1", toolName: "akcp.read_document", sideEffect: "read", payload: {} },
      async () => "success"
    );

    expect(result).toBe("success");
    const events = await auditLog.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].decision).toBe("allow");
  });

  it("should block execution and emit policy-deny audit event", async () => {
    gateway = new MCPGateway({
      policies: { "agent-1": policyDenyAll },
      auditLogService: auditLog
    });

    await expect(gateway.execute(
      { agentId: "agent-1", toolName: "akcp.read_document", sideEffect: "read", payload: {} },
      async () => "success"
    )).rejects.toThrow("Policy Violation");

    const events = await auditLog.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].decision).toBe("deny");
  });

  it("should pause execution, require approval, and resume when token is provided", async () => {
    gateway = new MCPGateway({
      policies: { "agent-1": policyRequiresApproval },
      auditLogService: auditLog,
      approvalStore
    });

    const payload = { data: "test" };

    // 1. Initial attempt fails with APPROVAL_REQUIRED
    let generatedToken = "";
    try {
      await gateway.execute(
        { agentId: "agent-1", toolName: "akcp.external_submit", sideEffect: "submit", payload },
        async () => "success"
      );
      expect.fail("Should have thrown APPROVAL_REQUIRED");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      expect(err.code).toBe("APPROVAL_REQUIRED");
      generatedToken = err.data.approvalToken;
    }

    // Check Audit logs for approval requirement
    let events = await auditLog.getEvents();
    expect(events.map(e => e.decision)).toContain("require_approval");

    // 2. Approve token out of band
    await approvalStore.approveToken(generatedToken, "human-approver");

    // 3. Resume execution with token
    const result = await gateway.execute(
      { agentId: "agent-1", toolName: "akcp.external_submit", sideEffect: "submit", payload: { ...payload, _approvalToken: generatedToken } },
      async () => "success"
    );

    expect(result).toBe("success");

    events = await auditLog.getEvents();
    expect(events.map(e => e.decision)).toContain("consumed");
  });

  it("should block execution if payload hash does not match approval token", async () => {
    gateway = new MCPGateway({
      policies: { "agent-1": policyRequiresApproval },
      auditLogService: auditLog,
      approvalStore
    });

    const payload = { data: "test" };

    // 1. Initial attempt fails with APPROVAL_REQUIRED
    let generatedToken = "";
    try {
      await gateway.execute(
        { agentId: "agent-1", toolName: "akcp.external_submit", sideEffect: "submit", payload },
        async () => "success"
      );
      expect.fail("Should have thrown APPROVAL_REQUIRED");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      generatedToken = err.data.approvalToken;
    }

    // 2. Approve token out of band
    await approvalStore.approveToken(generatedToken, "human-approver");

    // 3. Attempt execution with token but MODIFIED payload
    const modifiedPayload = { data: "malicious-change", _approvalToken: generatedToken };

    await expect(gateway.execute(
      { agentId: "agent-1", toolName: "akcp.external_submit", sideEffect: "submit", payload: modifiedPayload },
      async () => "success"
    )).rejects.toThrow("Invalid, expired, or tampered approval token");

    const events = await auditLog.getEvents();
    expect(events.map(e => e.decision)).toContain("expired"); // Maps to invalid/expired
  });

  it("should rate limit excessive requests", async () => {
    gateway = new MCPGateway({
      policies: { "agent-1": policyAllowAll },
      auditLogService: auditLog,
      rateLimiter: { maxTokens: 3, refillRate: 1 },
    });

    // First 3 should succeed
    for (let i = 0; i < 3; i++) {
      await gateway.execute(
        { agentId: "agent-1", toolName: "akcp.read_document", sideEffect: "read", payload: {} },
        async () => "success",
      );
    }

    // 4th should be rate limited
    await expect(
      gateway.execute(
        { agentId: "agent-1", toolName: "akcp.read_document", sideEffect: "read", payload: {} },
        async () => "success",
      ),
    ).rejects.toThrow("Rate limit exceeded");
  });
});

describe("Authentication", () => {
  it("should reject unauthenticated requests when auth is configured", async () => {
    const policyAllowAll = {
      metadata: { name: "allow-all" },
      appliesTo: { capabilities: ["*"] },
      rules: [{ effect: "allow" as const }]
    };

    const authGateway = new MCPGateway({
      policies: { "agent-1": policyAllowAll },
      auth: {
        requireAuth: true,
        credentials: [
          { agentId: "agent-1", apiKey: "hashed_key_here", createdAt: new Date().toISOString() },
        ],
      },
    });

    await expect(
      authGateway.execute(
        { requestId: "req-1", agentId: "agent-1", toolName: "akcp.read", sideEffect: "read", payload: {} },
        async () => "success",
      ),
    ).rejects.toThrow("Authentication failed");
  });
});
