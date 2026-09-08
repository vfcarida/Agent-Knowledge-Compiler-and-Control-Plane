import type { CapabilityRequest } from "./request.js";
import type { PolicyCard } from "../policy/types.js";
import {
  evaluatePolicies,
  type PolicyRequest,
  type PolicyDecision,
} from "../policies/engine.js";
import { adaptPolicyCardToRules } from "../policies/adapter.js";
import type { PolicyProvider } from "../policies/provider.js";
import type { IApprovalStore } from "./approval-store.js";
import { authenticate, type AuthConfig } from "./auth.js";
import { createPiiDetector } from "../privacy/create-detector.js";
import type { PiiDetector, PiiMatch } from "../privacy/pii-detector.js";
import {
  createRateLimiter,
  type IRateLimiter,
  type RateLimiterConfig,
} from "./rate-limiter.js";
import type {
  IAuditLogService,
  AuditRiskLevel,
} from "../infrastructure/audit-log.js";
import { CostTracker, type CostTrackerConfig } from "./cost-tracker.js";
import crypto from "crypto";

export class MCPGatewayError extends Error {
  constructor(
    public readonly message: string,
    public readonly _code: string,

    public readonly _data?: unknown,
  ) {
    super(message);
    this.name = "MCPGatewayError";
  }

  /** Public alias for _code — use `error.code` in consumers. */
  get code(): string {
    return this._code;
  }

  /** Public alias for _data — use `error.data` in consumers. */

  get data(): unknown {
    return this._data;
  }
}

export interface GatewayConfig {
  policies?: Record<string, PolicyCard>; // Map of agentId -> PolicyCard (optional if policyProvider is provided)
  defaultPolicy?: PolicyCard;
  policyProvider?: PolicyProvider;
  approvalStore?: IApprovalStore;
  auditLogService?: IAuditLogService;
  piiDetector?: PiiDetector;
  rateLimiter?: RateLimiterConfig;
  auth?: AuthConfig;
  costTracker?: CostTracker;
  costBudget?: CostTrackerConfig;
}

export class MCPGateway {
  private limiter?: IRateLimiter;
  private costTracker: CostTracker;

  constructor(private config: GatewayConfig) {
    if (config.rateLimiter) {
      this.limiter = createRateLimiter(config.rateLimiter);
    }
    this.costTracker = config.costTracker || new CostTracker(config.costBudget);
  }

  public getCostTracker(): CostTracker {
    return this.costTracker;
  }

  public async execute<T>(
    request: CapabilityRequest,
    executor: () => Promise<T>,
  ): Promise<T> {
    let effectiveAgentId = request.agentId || "anonymous";
    const requestId = request.requestId || crypto.randomUUID();

    // Rate limiting check
    if (this.limiter && !(await this.limiter.consume(effectiveAgentId))) {
      if (this.config.auditLogService) {
        await this.config.auditLogService.logEvent({
          action: "rate_limit.exceeded",
          actor: effectiveAgentId,
          requestId: crypto.randomUUID(),
          capabilityId: request.toolName,
          decision: "deny",
          riskLevel: (request.riskLevel as AuditRiskLevel) || "medium",
          evidence: { reason: "Rate limit exceeded" },
        });
      }
      throw new MCPGatewayError(
        `Rate limit exceeded for agent '${effectiveAgentId}'. Try again later.`,
        "RATE_LIMITED",
      );
    }

    let activeScopes: string[] = [];

    // Authentication check
    if (this.config.auth) {
      const authResult = authenticate(request.apiKey, this.config.auth, {
        sourceId: request.sourceId || effectiveAgentId,
      });

      if (!authResult.authenticated) {
        if (this.config.auditLogService) {
          await this.config.auditLogService.logEvent({
            action: "auth.failed",
            actor: effectiveAgentId,
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

      // Track authenticated identity without mutating request object in-place
      effectiveAgentId = authResult.agentId || "anonymous";

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

    const policy = this.resolvePolicy(effectiveAgentId);
    const payloadHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(request.payload || {}))
      .digest("hex");

    if (!policy && !this.config.policyProvider) {
      if (this.config.auditLogService) {
        await this.config.auditLogService.logEvent({
          action: "policy.evaluate",
          actor: effectiveAgentId,
          requestId,
          capabilityId: request.toolName,
          decision: "error",
          riskLevel: (request.riskLevel as AuditRiskLevel) || "medium",
          evidence: { reason: "No valid policy found" },
        });
      }
      throw new MCPGatewayError(
        `Unauthorized: No valid policy found for agent '${effectiveAgentId}'.`,
        "UNAUTHORIZED_AGENT",
      );
    }

    // Extract token
    const payloadObj = (request.payload as Record<string, unknown>) || {};
    const token = payloadObj._approvalToken as string | undefined;

    // Evaluate Policies via PolicyProvider (if configured) or adapted PolicyCard rules
    const policyRequest: PolicyRequest = {
      tool: request.toolName,
      agentId: effectiveAgentId,
      riskLevel: request.riskLevel || "medium",
      scopes: activeScopes,
      approvalToken: token,
      sideEffect: request.sideEffect,
    };

    let evalResult: PolicyDecision;
    if (this.config.policyProvider) {
      evalResult = await this.config.policyProvider.evaluate(policyRequest);
    } else if (policy) {
      const rules = adaptPolicyCardToRules(policy);
      evalResult = evaluatePolicies(rules, policyRequest);
    } else {
      throw new MCPGatewayError(
        `Unauthorized: No valid policy found for agent '${effectiveAgentId}'.`,
        "UNAUTHORIZED_AGENT",
      );
    }

    const resolvedPolicyIds: string[] = policy?.id
      ? [policy.id]
      : evalResult.matchedRule?.id
        ? [evalResult.matchedRule.id]
        : [];

    if (evalResult.effect === "deny") {
      if (this.config.auditLogService) {
        await this.config.auditLogService.logEvent({
          action: "policy.evaluate",
          actor: effectiveAgentId,
          requestId,
          capabilityId: request.toolName,
          decision: "deny",
          riskLevel: (request.riskLevel as AuditRiskLevel) || "medium",
          evidence: {
            payloadHash,
            policyIds: resolvedPolicyIds,
            reason: evalResult.reason,
          },
        });
      }
      throw new MCPGatewayError(
        `[LLM08: Excessive Agency] Policy Violation: ${evalResult.reason}`,
        "POLICY_VIOLATION",
      );
    }

    // Evaluate HITL requirement
    const requiresApproval = evalResult.obligations.some(
      (o) => o.type === "require_approval",
    );
    if (requiresApproval) {
      if (!this.config.approvalStore) {
        throw new MCPGatewayError(
          `[LLM08: Excessive Agency] Policy Violation: Tool requires approval, but no ApprovalStore is configured.`,
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
            actor: effectiveAgentId,
            requestId,
            capabilityId: request.toolName,
            decision: "require_approval",
            riskLevel: "high",
            evidence: {
              payloadHash: cleanPayloadHash,
              policyIds: resolvedPolicyIds,
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
          effectiveAgentId,
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
        effectiveAgentId,
      );
      if (!isValid) {
        if (this.config.auditLogService) {
          await this.config.auditLogService.logEvent({
            action: "approval.expire",
            actor: effectiveAgentId,
            requestId,
            capabilityId: request.toolName,
            decision: "expired",
            riskLevel: "high",
            evidence: {
              payloadHash: cleanPayloadHash,
              policyIds: resolvedPolicyIds,
            },
          });
        }
        throw new MCPGatewayError(
          `[LLM08: Excessive Agency] Policy Violation: Invalid, expired, or tampered approval token: ${token}`,
          "POLICY_VIOLATION",
        );
      }

      if (this.config.auditLogService) {
        await this.config.auditLogService.logEvent({
          action: "approval.consume",
          actor: effectiveAgentId,
          requestId,
          capabilityId: request.toolName,
          decision: "consumed",
          riskLevel: "high",
          evidence: {
            payloadHash: cleanPayloadHash,
            policyIds: resolvedPolicyIds,
          },
        });
      }
    }

    try {
      const result = await executor();

      let finalResult = result;

      // Post-execution sanitization
      const redactPii = evalResult.obligations.some(
        (o) => o.type === "pii_redact",
      );
      const denyPii = evalResult.obligations.some((o) => o.type === "pii_deny");

      if (redactPii) {
        finalResult = await this.sanitizeOutput(result);
      }

      if (denyPii) {
        if (await this.containsPII(finalResult)) {
          throw new MCPGatewayError(
            `[LLM06: Sensitive Information] Policy Violation: PII detected in output for tool '${request.toolName}' while policy dictates 'deny'.`,
            "POLICY_VIOLATION",
          );
        }
      }

      // Token & Cost Tracking
      const estimatedTokens = this.costTracker.estimateTokens(
        request.payload,
        finalResult,
      );
      const usage = this.costTracker.recordUsage(
        effectiveAgentId,
        estimatedTokens,
        request.toolName,
      );

      if (this.config.auditLogService) {
        await this.config.auditLogService.logEvent({
          action: "policy.evaluate",
          actor: effectiveAgentId,
          requestId,
          capabilityId: request.toolName,
          decision: "allow",
          riskLevel: (request.riskLevel as AuditRiskLevel) || "medium",
          evidence: {
            payloadHash,
            policyIds: resolvedPolicyIds,
            estimatedTokens,
            cumulativeTokens: usage.cumulativeTokens,
            budgetExceeded: usage.budgetExceeded,
          },
        });
      }

      return finalResult;
    } catch (err: unknown) {
      if (err instanceof MCPGatewayError) throw err;
      throw new MCPGatewayError(
        `Execution Failed: ${err instanceof Error ? err.message : String(err)}`,
        "EXECUTION_ERROR",
      );
    }
  }

  private resolvePolicy(agentId?: string): PolicyCard | undefined {
    if (agentId && this.config.policies && this.config.policies[agentId]) {
      return this.config.policies[agentId];
    }
    return this.config.defaultPolicy;
  }

  private get detector(): PiiDetector {
    return this.config.piiDetector || createPiiDetector();
  }

  private async sanitizeOutput<T>(output: T): Promise<T> {
    if (output === null || output === undefined) {
      return output;
    }
    if (typeof output === "string") {
      const matches: PiiMatch[] = await this.detector.detect(output);
      const sorted = [...matches].sort((a, b) => b.start - a.start);
      let result: string = output;
      for (const match of sorted) {
        result =
          result.slice(0, match.start) +
          `[REDACTED_${match.type.toUpperCase()}]` +
          result.slice(match.end);
      }
      return result as unknown as T;
    }
    if (Array.isArray(output)) {
      const sanitizedArray = [];
      for (const item of output) {
        sanitizedArray.push(await this.sanitizeOutput(item));
      }
      return sanitizedArray as unknown as T;
    }
    if (typeof output === "object") {
      const sanitizedObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(
        output as Record<string, unknown>,
      )) {
        sanitizedObj[key] = await this.sanitizeOutput(value);
      }
      return sanitizedObj as unknown as T;
    }
    return output;
  }

  private async containsPII(output: unknown): Promise<boolean> {
    if (output === null || output === undefined) return false;
    if (typeof output === "string") {
      const matches: PiiMatch[] = await this.detector.detect(output);
      return matches.some((m) => m.confidence === "high");
    }
    if (typeof output === "object") {
      const str = JSON.stringify(output);
      const matches: PiiMatch[] = await this.detector.detect(str);
      return matches.some((m) => m.confidence === "high");
    }
    return false;
  }
}
