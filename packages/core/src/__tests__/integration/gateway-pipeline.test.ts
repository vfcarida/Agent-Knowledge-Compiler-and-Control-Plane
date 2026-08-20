/**
 * MCPGateway Full Pipeline End-to-End Integration Tests
 *
 * Exercises the end-to-end governance lifecycle without mocking internal subsystems:
 *   1. Authentication (API key verification & identity attribution)
 *   2. Rate Limiting (Token bucket capacity & exhaustion)
 *   3. Policy Resolution (Agent policy lookup & defaults)
 *   4. Policy Evaluation (Forbidden tools, side effects, condition evaluation)
 *   5. HITL Approval Flow (Token generation, pause/prompt, approval, validation & consumption)
 *   6. Executor Execution (Real payload delivery & result handling)
 *   7. PII Post-processing (Regex detection, redaction, and strict deny modes)
 *   8. Audit Trail Completeness (Verified event emission for all decisions)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "node:crypto";
import { MCPGateway, MCPGatewayError } from "../../capabilities/gateway.js";
import { hashApiKey, type AuthConfig } from "../../capabilities/auth.js";
import type { CapabilityRequest } from "../../capabilities/request.js";
import type { PolicyCard } from "../../policy/types.js";
import type {
  IApprovalStore,
  PendingApproval,
} from "../../capabilities/approval-store.js";
import { InMemoryAuditLogService } from "../../infrastructure/audit-log.js";
import { RegexPiiDetector } from "../../privacy/regex-pii-detector.js";

// ─── Test Credentials ────────────────────────────────────────────────────────

const TEST_VALID_KEY = "akcp_test_key_valid_12345";
const TEST_SCOPED_KEY = "akcp_test_key_scoped_67890";
const TEST_STRICT_PII_KEY = "akcp_test_key_strict_pii_55555";
const TEST_TIME_KEY = "akcp_test_key_time_gated_77777";

const TEST_AGENT_ID = "test-agent-primary";
const TEST_SCOPED_AGENT_ID = "test-agent-scoped";
const TEST_STRICT_PII_AGENT_ID = "strict-pii-agent";
const TEST_TIME_AGENT_ID = "time-gated-agent";

// ─── In-Memory Approval Store ────────────────────────────────────────────────

class TestApprovalStore implements IApprovalStore {
  public approvals = new Map<string, PendingApproval>();

  async generateToken(
    requestId: string,
    capabilityId: string,
    payloadHash: string,
    riskLevel: string,
    sideEffectLevel: string,
    requestedBy: string,
    metadata?: Record<string, unknown>,
    ttlMs?: number,
  ): Promise<string> {
    const token = `appr_token_${crypto.randomBytes(8).toString("hex")}`;
    const approval: PendingApproval = {
      token,
      requestId,
      capabilityId,
      payloadHash,
      riskLevel,
      sideEffectLevel,
      requestedBy,
      createdAt: Date.now(),
      expiresAt: Date.now() + (ttlMs ?? 60000),
      status: "PENDING",
      auditEventIds: [],
      metadata,
    };
    this.approvals.set(token, approval);
    return token;
  }

  async getPendingApprovals(): Promise<PendingApproval[]> {
    return Array.from(this.approvals.values()).filter(
      (a) => a.status === "PENDING" && a.expiresAt > Date.now(),
    );
  }

  async getAuditLogs(_limit?: number): Promise<unknown[]> {
    return [];
  }

  async approveToken(token: string, actorIdentity?: string): Promise<boolean> {
    const approval = this.approvals.get(token);
    if (
      !approval ||
      approval.status !== "PENDING" ||
      approval.expiresAt <= Date.now()
    ) {
      return false;
    }
    approval.status = "APPROVED";
    approval.approvedBy = actorIdentity;
    return true;
  }

  async validateAndConsume(
    token: string,
    capabilityId: string,
    payloadHash: string,
    _actorIdentity?: string,
  ): Promise<boolean> {
    const approval = this.approvals.get(token);
    if (
      !approval ||
      approval.status !== "APPROVED" ||
      approval.expiresAt <= Date.now() ||
      approval.capabilityId !== capabilityId ||
      approval.payloadHash !== payloadHash
    ) {
      return false;
    }
    approval.status = "CONSUMED";
    approval.consumedAt = Date.now();
    return true;
  }

  async revokeToken(token: string, actorIdentity?: string): Promise<boolean> {
    const approval = this.approvals.get(token);
    if (!approval || approval.status !== "PENDING") {
      return false;
    }
    approval.status = "REVOKED";
    approval.approvedBy = actorIdentity;
    return true;
  }
}

// ─── Test Policies ───────────────────────────────────────────────────────────

const primaryPolicy: PolicyCard = {
  apiVersion: "policy.akcp.dev/v1alpha1",
  kind: "PolicyCard",
  metadata: { name: "primary-integration-policy" },
  spec: {
    allowedAgents: ["*"],
    allowedContextPacks: ["*"],
    allowedTools: [
      "read_knowledge",
      "search_docs",
      "execute_sensitive_action",
      "get_profile",
      "query_database",
    ],
    forbiddenTools: ["delete_database"],
    sideEffectRules: {
      read: "allow",
      write: "allow",
      submit: "deny",
    },
    approvalRequirements: ["execute_sensitive_action"],
    piiHandling: "redact",
  },
};

const strictPiiDenyPolicy: PolicyCard = {
  apiVersion: "policy.akcp.dev/v1alpha1",
  kind: "PolicyCard",
  metadata: { name: "strict-pii-deny-policy" },
  spec: {
    allowedAgents: ["*"],
    allowedContextPacks: ["*"],
    allowedTools: ["get_user_records"],
    forbiddenTools: [],
    sideEffectRules: {
      read: "allow",
      write: "allow",
      submit: "approval",
    },
    approvalRequirements: [],
    piiHandling: "deny",
  },
};

const conditionalTimePolicy: PolicyCard = {
  apiVersion: "policy.akcp.dev/v1alpha1",
  kind: "PolicyCard",
  metadata: { name: "conditional-time-policy" },
  appliesTo: {
    capabilities: ["business_hours_sync"],
  },
  rules: [
    {
      effect: "allow",
      condition: {
        type: "time_window",
        params: { startHour: 9, endHour: 17 },
      },
    },
  ],
};

// ─── Integration Suite ───────────────────────────────────────────────────────

describe("MCPGateway Integration", () => {
  let gateway: MCPGateway;
  let auditLogService: InMemoryAuditLogService;
  let approvalStore: TestApprovalStore;
  let authConfig: AuthConfig;

  beforeEach(() => {
    auditLogService = new InMemoryAuditLogService();
    approvalStore = new TestApprovalStore();

    authConfig = {
      requireAuth: true,
      maxAuthAttempts: 10,
      authCooldownMs: 60000,
      credentials: [
        {
          agentId: TEST_AGENT_ID,
          apiKey: hashApiKey(TEST_VALID_KEY),
          createdAt: new Date().toISOString(),
        },
        {
          agentId: TEST_SCOPED_AGENT_ID,
          apiKey: hashApiKey(TEST_SCOPED_KEY),
          createdAt: new Date().toISOString(),
          scopes: ["read_knowledge"],
        },
        {
          agentId: TEST_STRICT_PII_AGENT_ID,
          apiKey: hashApiKey(TEST_STRICT_PII_KEY),
          createdAt: new Date().toISOString(),
        },
        {
          agentId: TEST_TIME_AGENT_ID,
          apiKey: hashApiKey(TEST_TIME_KEY),
          createdAt: new Date().toISOString(),
        },
      ],
    };

    gateway = new MCPGateway({
      policies: {
        [TEST_AGENT_ID]: primaryPolicy,
        [TEST_STRICT_PII_AGENT_ID]: strictPiiDenyPolicy,
        [TEST_TIME_AGENT_ID]: conditionalTimePolicy,
      },
      auditLogService,
      approvalStore,
      auth: authConfig,
      rateLimiter: {
        maxTokens: 2,
        refillRate: 1,
        refillInterval: 60000,
      },
      piiDetector: new RegexPiiDetector(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 1. Happy Path: Valid Auth -> Policy Allows -> Executor Runs -> Result Returned
  it("executes happy path with valid auth, allowed policy, and clean result", async () => {
    const request: CapabilityRequest = {
      requestId: "req-happy-1",
      toolName: "read_knowledge",
      sideEffect: "read",
      agentId: TEST_AGENT_ID,
      apiKey: TEST_VALID_KEY,
      payload: { docId: "kb-arch-101" },
    };

    const result = await gateway.execute(request, async () => {
      return { status: "success", title: "Architecture Overview" };
    });

    expect(result).toEqual({
      status: "success",
      title: "Architecture Overview",
    });

    const events = await auditLogService.getEvents();
    const allowEvent = events.find(
      (e) => e.requestId === "req-happy-1" && e.action === "policy.evaluate",
    );
    expect(allowEvent).toBeDefined();
    expect(allowEvent?.decision).toBe("allow");
    expect(allowEvent?.actor).toBe(TEST_AGENT_ID);
    expect(allowEvent?.capabilityId).toBe("read_knowledge");
  });

  // 2. Auth Failure: Invalid Key -> UNAUTHORIZED Error
  it("rejects execution when an invalid API key is provided", async () => {
    const request: CapabilityRequest = {
      requestId: "req-auth-fail-1",
      toolName: "read_knowledge",
      sideEffect: "read",
      agentId: TEST_AGENT_ID,
      apiKey: "akcp_invalid_key_bogus_9999",
      payload: {},
    };

    await expect(
      gateway.execute(request, async () => ({ shouldNotRun: true })),
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(MCPGatewayError);
      const gwError = err as MCPGatewayError;
      expect(gwError.code).toBe("UNAUTHORIZED");
      expect(gwError.message).toMatch(/Authentication failed/i);
      return true;
    });

    const events = await auditLogService.getEvents();
    const authFailedEvent = events.find(
      (e) => e.requestId === "req-auth-fail-1" && e.action === "auth.failed",
    );
    expect(authFailedEvent).toBeDefined();
    expect(authFailedEvent?.decision).toBe("deny");
    expect(authFailedEvent?.riskLevel).toBe("high");
  });

  // 3. Rate Limit: Exceed Limit -> RATE_LIMITED Error
  it("enforces token bucket rate limiting on rapid requests", async () => {
    const makeReq = (idx: number): CapabilityRequest => ({
      requestId: `req-rate-${idx}`,
      toolName: "read_knowledge",
      sideEffect: "read",
      agentId: TEST_AGENT_ID,
      apiKey: TEST_VALID_KEY,
      payload: {},
    });

    // Request 1: succeeds (token 1 consumed)
    const res1 = await gateway.execute(makeReq(1), async () => ({ ok: 1 }));
    expect(res1).toEqual({ ok: 1 });

    // Request 2: succeeds (token 2 consumed)
    const res2 = await gateway.execute(makeReq(2), async () => ({ ok: 2 }));
    expect(res2).toEqual({ ok: 2 });

    // Request 3: rate limit exhausted (bucket maxTokens is 2)
    await expect(
      gateway.execute(makeReq(3), async () => ({ ok: 3 })),
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(MCPGatewayError);
      const gwError = err as MCPGatewayError;
      expect(gwError.code).toBe("RATE_LIMITED");
      expect(gwError.message).toMatch(/Rate limit exceeded/i);
      return true;
    });

    const events = await auditLogService.getEvents();
    const rateLimitEvent = events.find(
      (e) => e.action === "rate_limit.exceeded",
    );
    expect(rateLimitEvent).toBeDefined();
    expect(rateLimitEvent?.decision).toBe("deny");
    expect(rateLimitEvent?.actor).toBe(TEST_AGENT_ID);
  });

  // 4. Policy Deny: Forbidden Tool -> POLICY_VIOLATION Error
  it("blocks forbidden tools and logs policy denial", async () => {
    const request: CapabilityRequest = {
      requestId: "req-deny-forbidden-1",
      toolName: "delete_database",
      sideEffect: "write",
      agentId: TEST_AGENT_ID,
      apiKey: TEST_VALID_KEY,
      payload: { force: true },
    };

    await expect(
      gateway.execute(request, async () => ({ deleted: true })),
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(MCPGatewayError);
      const gwError = err as MCPGatewayError;
      expect(gwError.code).toBe("POLICY_VIOLATION");
      expect(gwError.message).toMatch(/Policy Violation/i);
      return true;
    });

    const events = await auditLogService.getEvents();
    const denyEvent = events.find(
      (e) =>
        e.requestId === "req-deny-forbidden-1" &&
        e.action === "policy.evaluate" &&
        e.decision === "deny",
    );
    expect(denyEvent).toBeDefined();
    expect(denyEvent?.capabilityId).toBe("delete_database");
  });

  // 5. HITL Required (No Token): Pauses and Returns APPROVAL_REQUIRED with Token
  it("pauses execution and provides approval token when HITL is required and no token is present", async () => {
    const request: CapabilityRequest = {
      requestId: "req-hitl-notoken-1",
      toolName: "execute_sensitive_action",
      sideEffect: "write",
      agentId: TEST_AGENT_ID,
      apiKey: TEST_VALID_KEY,
      payload: { action: "provision_resource", target: "cluster-a" },
    };

    let thrownError: MCPGatewayError | null = null;
    try {
      await gateway.execute(request, async () => ({ provisioned: true }));
    } catch (err) {
      if (err instanceof MCPGatewayError) {
        thrownError = err;
      }
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError?.code).toBe("APPROVAL_REQUIRED");
    expect(thrownError?.message).toMatch(/Approval Required/i);

    const errorData = thrownError?.data as { approvalToken?: string };
    expect(errorData?.approvalToken).toBeDefined();
    expect(typeof errorData.approvalToken).toBe("string");

    const events = await auditLogService.getEvents();
    const hitlReqEvent = events.find(
      (e) =>
        e.requestId === "req-hitl-notoken-1" &&
        e.action === "approval.request" &&
        e.decision === "require_approval",
    );
    expect(hitlReqEvent).toBeDefined();
    expect(hitlReqEvent?.capabilityId).toBe("execute_sensitive_action");
  });

  // 6. HITL Required (Valid Approved Token): Executes and Consumes Token
  it("proceeds with execution when a valid approved token is provided", async () => {
    const payload = { action: "provision_resource", target: "cluster-b" };
    const payloadHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");

    // 1. Generate token in store
    const token = await approvalStore.generateToken(
      "req-hitl-valid-1",
      "execute_sensitive_action",
      payloadHash,
      "high",
      "write",
      TEST_AGENT_ID,
    );

    // 2. Human approves token
    const approved = await approvalStore.approveToken(token, "security-admin");
    expect(approved).toBe(true);

    // 3. Execute with _approvalToken
    const request: CapabilityRequest = {
      requestId: "req-hitl-valid-1",
      toolName: "execute_sensitive_action",
      sideEffect: "write",
      agentId: TEST_AGENT_ID,
      apiKey: TEST_VALID_KEY,
      payload: { ...payload, _approvalToken: token },
    };

    const result = await gateway.execute(request, async () => {
      return { success: true, cluster: "cluster-b" };
    });

    expect(result).toEqual({ success: true, cluster: "cluster-b" });

    // Verify token consumed in audit log
    const events = await auditLogService.getEvents();
    const consumeEvent = events.find(
      (e) =>
        e.requestId === "req-hitl-valid-1" &&
        e.action === "approval.consume" &&
        e.decision === "consumed",
    );
    expect(consumeEvent).toBeDefined();
    expect(consumeEvent?.actor).toBe(TEST_AGENT_ID);
  });

  // 7. HITL Required (Invalid / Unapproved Token): Throws POLICY_VIOLATION
  it("rejects execution with POLICY_VIOLATION if approval token is unapproved or tampered", async () => {
    const request: CapabilityRequest = {
      requestId: "req-hitl-tampered-1",
      toolName: "execute_sensitive_action",
      sideEffect: "write",
      agentId: TEST_AGENT_ID,
      apiKey: TEST_VALID_KEY,
      payload: {
        action: "provision_resource",
        _approvalToken: "appr_token_fake_or_unapproved_123",
      },
    };

    await expect(
      gateway.execute(request, async () => ({ success: true })),
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(MCPGatewayError);
      const gwError = err as MCPGatewayError;
      expect(gwError.code).toBe("POLICY_VIOLATION");
      expect(gwError.message).toMatch(
        /Invalid, expired, or tampered approval token/i,
      );
      return true;
    });

    const events = await auditLogService.getEvents();
    const expireEvent = events.find(
      (e) =>
        e.requestId === "req-hitl-tampered-1" &&
        e.action === "approval.expire" &&
        e.decision === "expired",
    );
    expect(expireEvent).toBeDefined();
  });

  // 8. PII Redact: Output containing PII is automatically sanitized
  it("redacts PII from output when policy specifies piiHandling: redact", async () => {
    const request: CapabilityRequest = {
      requestId: "req-pii-redact-1",
      toolName: "get_profile",
      sideEffect: "read",
      agentId: TEST_AGENT_ID,
      apiKey: TEST_VALID_KEY,
      payload: { userId: "user-101" },
    };

    const result = await gateway.execute(request, async () => {
      return {
        username: "johndoe",
        email: "john.doe@example.fake",
        ssn: "000-12-3456",
        notes: "Verified customer account",
      };
    });

    expect(result.username).toBe("johndoe");
    expect(result.email).toBe("[REDACTED_EMAIL]");
    expect(result.ssn).toBe("[REDACTED_SSN]");
    expect(result.notes).toBe("Verified customer account");
  });

  // 9. PII Deny: Output containing PII triggers POLICY_VIOLATION
  it("blocks output with POLICY_VIOLATION when policy specifies piiHandling: deny and PII is detected", async () => {
    const request: CapabilityRequest = {
      requestId: "req-pii-deny-1",
      toolName: "get_user_records",
      sideEffect: "read",
      agentId: TEST_STRICT_PII_AGENT_ID,
      apiKey: TEST_STRICT_PII_KEY,
      payload: {},
    };

    await expect(
      gateway.execute(request, async () => {
        return {
          customerRecord: "Confidential leak: alice.smith@enterprise.fake",
        };
      }),
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(MCPGatewayError);
      const gwError = err as MCPGatewayError;
      expect(gwError.code).toBe("POLICY_VIOLATION");
      expect(gwError.message).toMatch(/PII detected in output/i);
      return true;
    });
  });

  // 10. Condition Enforcement: Time-Based Condition Blocks Outside Window & Allows Inside
  describe("Condition Enforcement: time_window", () => {
    it("denies access outside operating business hours (closed-world default deny)", async () => {
      vi.useFakeTimers();
      // Set time to 21:00 (9 PM) - outside 9 to 17 window
      vi.setSystemTime(new Date(2026, 7, 20, 21, 0, 0));

      const request: CapabilityRequest = {
        requestId: "req-time-outside-1",
        toolName: "business_hours_sync",
        sideEffect: "read",
        agentId: TEST_TIME_AGENT_ID,
        apiKey: TEST_TIME_KEY,
        payload: {},
      };

      await expect(
        gateway.execute(request, async () => ({ synced: true })),
      ).rejects.toSatisfy((err: unknown) => {
        expect(err).toBeInstanceOf(MCPGatewayError);
        const gwError = err as MCPGatewayError;
        expect(gwError.code).toBe("POLICY_VIOLATION");
        expect(gwError.message).toMatch(
          /No matching rule found\. Default: deny/i,
        );
        return true;
      });
    });

    it("allows access during operating business hours when condition is met", async () => {
      vi.useFakeTimers();
      // Set time to 14:00 (2 PM) - inside 9 to 17 window
      vi.setSystemTime(new Date(2026, 7, 20, 14, 0, 0));

      const request: CapabilityRequest = {
        requestId: "req-time-inside-1",
        toolName: "business_hours_sync",
        sideEffect: "read",
        agentId: TEST_TIME_AGENT_ID,
        apiKey: TEST_TIME_KEY,
        payload: {},
      };

      const result = await gateway.execute(request, async () => {
        return { synced: true, timestamp: "14:00:00" };
      });

      expect(result).toEqual({ synced: true, timestamp: "14:00:00" });

      const events = await auditLogService.getEvents();
      const allowEvent = events.find(
        (e) => e.requestId === "req-time-inside-1" && e.decision === "allow",
      );
      expect(allowEvent).toBeDefined();
      expect(allowEvent?.capabilityId).toBe("business_hours_sync");
    });
  });

  // Additional integration verification: Scoped key restrictions
  it("enforces tool scopes bound to authenticated agent identity", async () => {
    const request: CapabilityRequest = {
      requestId: "req-scope-violation-1",
      toolName: "query_database", // scoped key only has read_knowledge scope
      sideEffect: "read",
      agentId: TEST_SCOPED_AGENT_ID,
      apiKey: TEST_SCOPED_KEY,
      payload: {},
    };

    await expect(
      gateway.execute(request, async () => ({ data: "secret" })),
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(MCPGatewayError);
      const gwError = err as MCPGatewayError;
      expect(gwError.code).toBe("INSUFFICIENT_SCOPE");
      expect(gwError.message).toMatch(/does not have scope for tool/i);
      return true;
    });
  });
});
