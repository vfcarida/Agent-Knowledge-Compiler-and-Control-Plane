import type { PolicyProvider, PolicySource } from "./provider.js";
import type {
  PolicyRequest,
  PolicyDecision,
  PolicyRule,
  PolicyObligation,
} from "./engine.js";
import type { PolicyTrace } from "./trace.js";

export interface CedarConfig {
  endpoint: string; // e.g., "http://localhost:8080/v1/is_authorized"
  timeoutMs?: number;
}

export interface CedarRequest {
  principal: string;
  action: string;
  resource: string;
  context: Record<string, unknown>;
}

export interface CedarResponse {
  decision: "Allow" | "Deny";
  diagnostics?: {
    reason?: string[];
    errors?: string[];
  };
  obligations?: PolicyObligation[];
}

export class CedarPolicyProvider implements PolicyProvider {
  private config: CedarConfig;

  constructor(config: CedarConfig) {
    this.config = {
      timeoutMs: 5000,
      ...config,
    };
  }

  async evaluate(request: PolicyRequest): Promise<PolicyDecision> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.config.timeoutMs,
      );

      const cedarReq = this.mapToCedarRequest(request);

      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cedarReq),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Cedar responded with status: ${response.status}`);
      }

      const data = (await response.json()) as CedarResponse;

      if (!data || !data.decision) {
        return this.createDenyDecision(
          "Cedar returned an empty or invalid result",
        );
      }

      return {
        effect: data.decision === "Allow" ? "allow" : "deny",
        reason:
          data.diagnostics?.reason?.join(", ") ||
          (data.decision === "Allow" ? "Allowed by Cedar" : "Denied by Cedar"),
        obligations: data.obligations || [],
        matchedRule: this.createGenericRule(
          data.decision === "Allow" ? "allow" : "deny",
        ),
      };
    } catch (err: any) {
      // Fail-closed principle
      return this.createDenyDecision(`Cedar Evaluation Failed: ${err.message}`);
    }
  }

  async explain(_request: PolicyRequest): Promise<PolicyTrace | null> {
    // Explanation could be retrieved via diagnostics from Cedar, but simplified for MVP.
    return null;
  }

  async reload(_source: PolicySource): Promise<void> {
    // Assume external Cedar agent manages its own policies, or use a control plane endpoint
    return Promise.resolve();
  }

  async healthy(): Promise<boolean> {
    try {
      const healthUrl = new URL(
        "/health",
        new URL(this.config.endpoint).origin,
      ).toString();
      const res = await fetch(healthUrl, { method: "GET" });
      return res.ok;
    } catch {
      return false;
    }
  }

  private mapToCedarRequest(request: PolicyRequest): CedarRequest {
    // In Cedar, everything is an Entity. We map strings to conceptual entities.
    return {
      principal: `User::"${request.agentId}"`,
      action: `Action::"${request.tool}"`,
      resource: `Resource::"${request.sideEffect || "unknown"}"`,
      context: {
        riskLevel: request.riskLevel,
        scopes: request.scopes,
        environment: request.environment,
        hasApprovalToken: !!request.approvalToken,
      },
    };
  }

  private createDenyDecision(reason: string): PolicyDecision {
    return {
      effect: "deny",
      reason,
      obligations: [],
      matchedRule: this.createGenericRule("deny"),
    };
  }

  private createGenericRule(effect: "allow" | "deny"): PolicyRule {
    return {
      id: "CEDAR_EXTERNAL_RULE",
      priority: 100,
      effect,
      match: {},
      conditions: [],
      obligations: [],
    };
  }
}
