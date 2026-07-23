/**
 * Security Test Fixtures — factories para criar gateway e credenciais.
 *
 * Cada factory produz um objeto completamente autocontido para uso em testes
 * unitários. Nenhuma dependência externa, sem estado compartilhado entre testes.
 */

import crypto from "crypto";
import { MCPGateway } from "../../capabilities/gateway.js";
import type { GatewayConfig } from "../../capabilities/gateway.js";
import { hashApiKey } from "../../capabilities/auth.js";
import type { AuthConfig } from "../../capabilities/auth.js";
import { InMemoryAuditLogService } from "../../infrastructure/audit-log.js";
import { RegexPiiDetector } from "../../privacy/regex-pii-detector.js";
import type { PolicyCard } from "../../policy/types.js";
import type {
  IApprovalStore,
  PendingApproval,
} from "../../capabilities/approval-store.js";

// ─── Canonical test API key ────────────────────────────────────────────────

export const TEST_PLAIN_KEY = "akcp_sectest_validkey_ABCDEF1234567890";
export const TEST_AGENT_ID = "sec-test-agent";
export const TEST_SCOPED_KEY = "akcp_sectest_scopedkey_ABCDEF1234567891";
export const TEST_SCOPED_AGENT = "sec-scoped-agent";
export const TEST_EXPIRED_KEY = "akcp_sectest_expiredkey_ABCDEF12345678";
export const TEST_EXPIRED_AGENT = "sec-expired-agent";

// ─── Policy factories ──────────────────────────────────────────────────────

/** A minimal allow-all policy — baseline for gateway execution. */
export function allowAllPolicy(
  overrides: Partial<PolicyCard["spec"]> = {},
): PolicyCard {
  return {
    apiVersion: "policy.akcp.dev/v1alpha1",
    kind: "PolicyCard",
    metadata: { name: "allow-all-test" },
    spec: {
      allowedAgents: ["*"],
      allowedContextPacks: ["*"],
      allowedTools: ["*"],
      forbiddenTools: [],
      approvalRequirements: [],
      piiHandling: "allow-with-audit",
      ...overrides,
    },
  } as unknown as PolicyCard;
}

/** A strict deny-all policy for testing policy enforcement. */
export function denyAllPolicy(): PolicyCard {
  return {
    apiVersion: "policy.akcp.dev/v1alpha1",
    kind: "PolicyCard",
    metadata: { name: "deny-all-test" },
    rules: [{ effect: "deny" }],
    spec: {
      allowedAgents: ["*"],
      allowedContextPacks: ["*"],
      allowedTools: [],
      forbiddenTools: ["*"],
      approvalRequirements: [],
      piiHandling: "deny",
    },
  } as unknown as PolicyCard;
}

/** A policy that requires HITL approval for a specific tool. */
export function approvalRequiredPolicy(toolName: string): PolicyCard {
  return {
    apiVersion: "policy.akcp.dev/v1alpha1",
    kind: "PolicyCard",
    metadata: { name: "approval-required-test" },
    spec: {
      allowedAgents: ["*"],
      allowedContextPacks: ["*"],
      allowedTools: [toolName],
      forbiddenTools: [],
      approvalRequirements: [toolName],
      piiHandling: "redact",
    },
  } as unknown as PolicyCard;
}

/** A policy that redacts PII from all tool outputs. */
export function piiRedactPolicy(): PolicyCard {
  return {
    apiVersion: "policy.akcp.dev/v1alpha1",
    kind: "PolicyCard",
    metadata: { name: "pii-redact-test" },
    spec: {
      allowedAgents: ["*"],
      allowedContextPacks: ["*"],
      allowedTools: ["*"],
      forbiddenTools: [],
      approvalRequirements: [],
      piiHandling: "redact",
    },
  } as unknown as PolicyCard;
}

/** A policy that denies tool output containing PII. */
export function piiDenyPolicy(): PolicyCard {
  return {
    apiVersion: "policy.akcp.dev/v1alpha1",
    kind: "PolicyCard",
    metadata: { name: "pii-deny-test" },
    spec: {
      allowedAgents: ["*"],
      allowedContextPacks: ["*"],
      allowedTools: ["*"],
      forbiddenTools: [],
      approvalRequirements: [],
      piiHandling: "deny",
    },
  } as unknown as PolicyCard;
}

// ─── Auth Config factory ───────────────────────────────────────────────────

/**
 * Builds an AuthConfig with a valid key, a scoped key, and an expired key.
 * Pass a fresh instance per test to avoid shared brute-force limiter state.
 */
export function makeAuthConfig(): AuthConfig {
  return {
    requireAuth: true,
    maxAuthAttempts: 5,
    authCooldownMs: 60000,
    credentials: [
      {
        agentId: TEST_AGENT_ID,
        apiKey: hashApiKey(TEST_PLAIN_KEY),
        createdAt: new Date().toISOString(),
        // no scopes → can call any tool
      },
      {
        agentId: TEST_SCOPED_AGENT,
        apiKey: hashApiKey(TEST_SCOPED_KEY),
        createdAt: new Date().toISOString(),
        scopes: ["read_knowledge"],
      },
      {
        agentId: TEST_EXPIRED_AGENT,
        apiKey: hashApiKey(TEST_EXPIRED_KEY),
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        expiresAt: new Date(Date.now() - 86400000).toISOString(), // expired yesterday
      },
    ],
  };
}

// ─── Gateway factory ───────────────────────────────────────────────────────

/**
 * Creates a fully-configured MCPGateway for security testing.
 * Every call returns a fresh instance — no shared state between tests.
 */
export function makeGateway(
  overrides: Partial<GatewayConfig> & {
    agentId?: string;
    policy?: PolicyCard;
  } = {},
): { gateway: MCPGateway; auditLog: InMemoryAuditLogService } {
  const auditLog = new InMemoryAuditLogService();
  const agentId = overrides.agentId ?? TEST_AGENT_ID;
  const policy = overrides.policy ?? allowAllPolicy();

  const gateway = new MCPGateway({
    policies: { [agentId]: policy },
    auditLogService: auditLog,
    piiDetector: new RegexPiiDetector(),
    ...overrides,
  });

  return { gateway, auditLog };
}

/**
 * Creates a gateway with auth enforcement enabled.
 * Pass authConfig from makeAuthConfig() — must be fresh per test.
 */
export function makeAuthGateway(
  authConfig: AuthConfig,
  policy: PolicyCard = allowAllPolicy(),
  agentId: string = TEST_AGENT_ID,
): { gateway: MCPGateway; auditLog: InMemoryAuditLogService } {
  const auditLog = new InMemoryAuditLogService();
  const gateway = new MCPGateway({
    policies: { [agentId]: policy },
    auditLogService: auditLog,
    piiDetector: new RegexPiiDetector(),
    auth: authConfig,
  });
  return { gateway, auditLog };
}

// ─── Approval store mock ───────────────────────────────────────────────────

/**
 * An in-memory approval store implementation for testing HITL flows.
 * Supports manual approval and consume to simulate full approval lifecycle.
 */
export class InMemoryApprovalStore implements IApprovalStore {
  private approvals: PendingApproval[] = [];
  public tokens: string[] = [];

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
    const token = `token_${crypto.randomBytes(16).toString("hex")}`;
    this.tokens.push(token);
    this.approvals.push({
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
    });
    return token;
  }

  async validateAndConsume(
    token: string,
    capabilityId: string,
    payloadHash: string,

    _actorIdentity?: string,
  ): Promise<boolean> {
    const approval = this.approvals.find((a) => a.token === token);
    if (
      !approval ||
      approval.status !== "APPROVED" ||
      approval.capabilityId !== capabilityId ||
      approval.payloadHash !== payloadHash
    ) {
      return false;
    }
    approval.status = "CONSUMED";
    approval.consumedAt = Date.now();
    return true;
  }

  async approveToken(token: string, actorIdentity?: string): Promise<boolean> {
    const approval = this.approvals.find((a) => a.token === token);
    if (!approval || approval.status !== "PENDING") return false;
    approval.status = "APPROVED";
    approval.approvedBy = actorIdentity;
    return true;
  }

  async revokeToken(token: string, actorIdentity?: string): Promise<boolean> {
    const approval = this.approvals.find((a) => a.token === token);
    if (!approval || approval.status !== "PENDING") return false;
    approval.status = "REVOKED";
    approval.approvedBy = actorIdentity;
    return true;
  }

  async getPendingApprovals(): Promise<PendingApproval[]> {
    return this.approvals.filter((a) => a.status === "PENDING");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getAuditLogs(): Promise<any[]> {
    return [];
  }
}

// ─── Standard requests ─────────────────────────────────────────────────────

export function makeRequest(overrides: {
  toolName?: string;
  sideEffect?: "read" | "write" | "submit";
  agentId?: string;
  apiKey?: string;
  payload?: Record<string, unknown>;
}) {
  return {
    requestId: crypto.randomUUID(),
    toolName: overrides.toolName ?? "read_knowledge",
    sideEffect: overrides.sideEffect ?? "read",
    agentId: overrides.agentId ?? TEST_AGENT_ID,
    apiKey: overrides.apiKey,
    payload: overrides.payload ?? {},
  };
}
