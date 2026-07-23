import type { CapabilityRequest } from "./request.js";
import type { PolicyCard } from "../policy/types.js";
import { evaluatePolicies } from "../policies/engine.js";
import { adaptPolicyCardToRules } from "../policies/adapter.js";
import type { IApprovalStore } from "./approval-store.js";
import { authenticate, type AuthConfig } from "./auth.js";
import { createPiiDetector } from "../privacy/create-detector.js";
import type { PiiDetector, PiiMatch } from "../privacy/pii-detector.js";
import {
  TokenBucketRateLimiter,
  type RateLimiterConfig,
} from "./rate-limiter.js";
import type { IAuditLogService } from "../infrastructure/audit-log.js";
import crypto from "crypto";

export class MCPGatewayError extends Error {
  constructor(
    public readonly message: string,
    public readonly _code: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly _data?: any,
  ) {
    super(message);
    this.name = "MCPGatewayError";
  }

  /** Public alias for _code — use `error.code` in consumers. */
  get code(): string {
    return this._code;
  }

  /** Public alias for _data — use `error.data` in consumers. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get data(): any {
    return this._data;
  }
}

export interface GatewayConfig {
  policies: Record<string, PolicyCard>; // Map of agentId -> PolicyCard
  defaultPolicy?: PolicyCard;
  approvalStore?: IApprovalStore;
  auditLogService?: IAuditLogService;
  piiDetector?: PiiDetector;
  rateLimiter?: RateLimiterConfig;
  auth?: AuthConfig;
}

export class MCPGateway {
  private limiter?: TokenBucketRateLimiter;

  constructor(private config: GatewayConfig) {
    if (config.rateLimiter) {
      this.limiter = new TokenBucketRateLimiter(config.rateLimiter);
    }
  }

  public async execute<T>(
    request: CapabilityRequest,
    executor: () => Promise<T>,
  ): Promise<T> {
    const agentKey = request.agentId || "anonymous";
    const requestId = request.requestId || crypto.randomUUID();

    // Rate limiting check
    if (this.limiter && !this.limiter.consume(agentKey)) {
      if (this.config.auditLogService) {
        await this.config.auditLogService.logEvent({
          action: "rate_limit.exceeded",
          actor: agentKey,
          requestId: crypto.randomUUID(),
          capabilityId: request.toolName,
          decision: "deny",
          riskLevel: "medium",
          evidence: { reason: "Rate limit exceeded" },
        });
      }
      throw new MCPGatewayError(
        `Rate limit exceeded for agent '${agentKey}'. Try again later.`,
        "RATE_LIMITED",
      );
    }

    let activeScopes: string[] = [];

    // Authentication check
    if (this.config.auth) {
      const authResult = authenticate(request.apiKey, this.config.auth, {
        sourceId: request.sourceId || request.agentId || "unknown",
      });

      if (!authResult.authenticated) {
        if (this.config.auditLogService) {
          await this.config.auditLogService.logEvent({
            action: "auth.failed",
            actor: request.agentId || "unknown",
            requestId,
            capabilityId: request.toolName,
            decision: "deny",
            riskLevel: "high",
            evidence: { reason: authResult.reason },
          });
        }
        throw new MCPGatewayError(
          `Authentication failed: ${authResult.reason}`,
          "UNAUTHORIZED",
        );
      }

      // Override self-declared agentId with authenticated identity
      request.agentId = authResult.agentId;

      // Check scope restriction
      if (authResult.scopes && authResult.scopes.length > 0) {
        activeScopes = authResult.scopes;
        const hasScope = authResult.scopes.some(
          (s) =>
            s === "*" ||
            s === request.toolName ||
            (s.endsWith("*") &&
              request.toolName.startsWith(s.replace("*", ""))),
        );
        if (!hasScope) {
          throw new MCPGatewayError(
            `Agent '${authResult.agentId}' does not have scope for tool '${request.toolName}'.`,
            "INSUFFICIENT_SCOPE",
          );
        }
      }
    }

    const policy = this.resolvePolicy(request.agentId);
    const payloadHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(request.payload || {}))
      .digest("hex");

    if (!policy) {
      if (this.config.auditLogService) {
        await this.config.auditLogService.logEvent({
          action: "policy.evaluate",
          actor: request.agentId || "anonymous",
          requestId,
          capabilityId: request.toolName,
          decision: "error",
          riskLevel: "medium",
          evidence: { reason: "No valid policy found" },
        });
      }
      throw new MCPGatewayError(
        `Unauthorized: No valid policy found for agent '${request.agentId || "anonymous"}'.`,
        "UNAUTHORIZED_AGENT",
      );
    }

    // Extract token
    const payloadObj = (request.payload as Record<string, unknown>) || {};
    const token = payloadObj._approvalToken as string | undefined;

    // Evaluate Policies
    const rules = adaptPolicyCardToRules(policy);
    const evalResult = evaluatePolicies(rules, {
      tool: request.toolName,
      agentId: request.agentId || "anonymous",
      riskLevel: "medium", // Default to medium risk if not specified
      scopes: activeScopes,
      approvalToken: token,
      sideEffect: request.sideEffect,
    });

    if (evalResult.effect === "deny") {
      if (this.config.auditLogService) {
        await this.config.auditLogService.logEvent({
          action: "policy.evaluate",
          actor: request.agentId || "anonymous",
          requestId,
          capabilityId: request.toolName,
          decision: "deny",
          riskLevel: "medium",
          evidence: {
            payloadHash,
            policyIds: policy.id ? [policy.id] : [],
            reason: evalResult.reason,
          },
        });
      }
      throw new MCPGatewayError(
        `[LLM06: Excessive Agency] Policy Violation: ${evalResult.reason}`,
        "POLICY_VIOLATION",
      );
    }

    if (this.config.auditLogService) {
      await this.config.auditLogService.logEvent({
        action: "policy.evaluate",
        actor: request.agentId || "anonymous",
        requestId,
        capabilityId: request.toolName,
        decision: "allow",
        riskLevel: "medium",
        evidence: {
          payloadHash,
          policyIds: policy.id ? [policy.id] : [],
        },
      });
    }

    // Evaluate HITL requirement
    const requiresApproval = evalResult.obligations.some(
      (o) => o.type === "require_approval",
    );
    if (requiresApproval) {
      if (!this.config.approvalStore) {
        throw new MCPGatewayError(
          `[LLM06: Excessive Agency] Policy Violation: Tool requires approval, but no ApprovalStore is configured.`,
          "POLICY_VIOLATION",
        );
      }

      // Token already extracted above

      // Clean up token from payload so it doesn't affect hash verification
      const cleanPayload = { ...payloadObj };
      delete cleanPayload._approvalToken;
      const cleanPayloadHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(cleanPayload))
        .digest("hex");

      if (!token) {
        if (this.config.auditLogService) {
          await this.config.auditLogService.logEvent({
            action: "approval.request",
            actor: request.agentId || "anonymous",
            requestId,
            capabilityId: request.toolName,
            decision: "require_approval",
            riskLevel: "high",
            evidence: {
              payloadHash: cleanPayloadHash,
              policyIds: policy.id ? [policy.id] : [],
            },
          });
        }
        // No token provided, generate one and throw APPROVAL_REQUIRED
        const generatedToken = await this.config.approvalStore.generateToken(
          requestId,
          request.toolName,
          cleanPayloadHash,
          "high",
          request.sideEffect,
          request.agentId || "anonymous",
          { payload: cleanPayload },
        );
        throw new MCPGatewayError(
          `Approval Required. The execution of '${request.toolName}' has been paused and requires human authorization. Provide this token to the user: ${generatedToken}`,
          "APPROVAL_REQUIRED",
          { approvalToken: generatedToken },
        );
      }

      // Token provided, validate it
      const isValid = await this.config.approvalStore.validateAndConsume(
        token,
        request.toolName,
        cleanPayloadHash,
        request.agentId,
      );
      if (!isValid) {
        if (this.config.auditLogService) {
          await this.config.auditLogService.logEvent({
            action: "approval.expire",
            actor: request.agentId || "anonymous",
            requestId,
            capabilityId: request.toolName,
            decision: "expired",
            riskLevel: "high",
            evidence: {
              payloadHash: cleanPayloadHash,
              policyIds: policy.id ? [policy.id] : [],
            },
          });
        }
        throw new MCPGatewayError(
          `[LLM06: Excessive Agency] Policy Violation: Invalid, expired, or tampered approval token: ${token}`,
          "POLICY_VIOLATION",
        );
      }

      if (this.config.auditLogService) {
        await this.config.auditLogService.logEvent({
          action: "approval.consume",
          actor: request.agentId || "anonymous",
          requestId,
          capabilityId: request.toolName,
          decision: "consumed",
          riskLevel: "high",
          evidence: {
            payloadHash: cleanPayloadHash,
            policyIds: policy.id ? [policy.id] : [],
          },
        });
      }

      // Ensure execution continues with the cleaned payload
      request.payload = cleanPayload;
    }

    try {
      const result = await executor();

      // Post-execution sanitization
      const redactPii = evalResult.obligations.some(
        (o) => o.type === "pii_redact",
      );
      const denyPii = evalResult.obligations.some((o) => o.type === "pii_deny");

      if (redactPii) {
        return await this.sanitizeOutput(result);
      }

      if (denyPii) {
        if (await this.containsPII(result)) {
          throw new MCPGatewayError(
            `[LLM06: Sensitive Information] Policy Violation: PII detected in output for tool '${request.toolName}' while policy dictates 'deny'.`,
            "POLICY_VIOLATION",
          );
        }
      }

      return result;
    } catch (err: unknown) {
      if (err instanceof MCPGatewayError) throw err;
      throw new MCPGatewayError(
        `Execution Failed: ${err instanceof Error ? err.message : String(err)}`,
        "EXECUTION_ERROR",
      );
    }
  }

  private resolvePolicy(agentId?: string): PolicyCard | undefined {
    if (agentId && this.config.policies[agentId]) {
      return this.config.policies[agentId];
    }
    return this.config.defaultPolicy;
  }

  private get detector(): PiiDetector {
    return this.config.piiDetector || createPiiDetector();
  }

  private async sanitizeOutput<T>(output: T): Promise<T> {
    let str = JSON.stringify(output);
    const matches: PiiMatch[] = await this.detector.detect(str);

    const sorted = [...matches].sort((a, b) => b.start - a.start);
    for (const match of sorted) {
      str =
        str.slice(0, match.start) +
        `[REDACTED_${match.type.toUpperCase()}]` +
        str.slice(match.end);
    }

    return JSON.parse(str) as T;
  }

  private async containsPII(output: unknown): Promise<boolean> {
    const str = JSON.stringify(output);
    const matches: PiiMatch[] = await this.detector.detect(str);
    return matches.some((m) => m.confidence === "high");
  }
}
