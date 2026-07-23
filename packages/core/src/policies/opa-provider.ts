import type { PolicyProvider, PolicySource } from "./provider.js";
import type {
  PolicyRequest,
  PolicyDecision,
  PolicyRule,
  PolicyObligation,
} from "./engine.js";
import type { PolicyTrace } from "./trace.js";

export interface OPAConfig {
  endpoint: string; // e.g., "http://localhost:8181/v1/data/akcp/authz"
  timeoutMs?: number;
}

export interface OPAResponse {
  result?: {
    allow: boolean;
    reason?: string;
    obligations?: PolicyObligation[];
    matched_rule?: Partial<PolicyRule>;
  };
}

export class OPAPolicyProvider implements PolicyProvider {
  private config: OPAConfig;

  constructor(config: OPAConfig) {
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

      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: request }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`OPA responded with status: ${response.status}`);
      }

      const data = (await response.json()) as OPAResponse;
      const result = data.result;

      if (!result) {
        return this.createDenyDecision(
          "OPA returned an empty or invalid result",
        );
      }

      return {
        effect: result.allow ? "allow" : "deny",
        reason:
          result.reason || (result.allow ? "Allowed by OPA" : "Denied by OPA"),
        obligations: result.obligations || [],
        matchedRule: this.mapRule(result.matched_rule),
      };
    } catch (err: any) {
      // Fail-closed principle
      return this.createDenyDecision(`OPA Evaluation Failed: ${err.message}`);
    }
  }

  async explain(_request: PolicyRequest): Promise<PolicyTrace | null> {
    // OPA explanation trace could be requested via ?explain=full
    // For now, not fully translating OPA AST explanations to our PolicyTrace
    return null;
  }

  async reload(_source: PolicySource): Promise<void> {
    // OPA policies are generally managed out-of-band by pushing to the OPA server.
    // If inline policies are provided, we COULD use OPA's PUT /v1/policies API,
    // but typically the orchestrator treats OPA as a read-only endpoint.
    return Promise.resolve();
  }

  async healthy(): Promise<boolean> {
    try {
      // Typically OPA has a health endpoint at /health
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

  private createDenyDecision(reason: string): PolicyDecision {
    return {
      effect: "deny",
      reason,
      obligations: [],
      matchedRule: {
        id: "OPA_DENY",
        priority: 999,
        effect: "deny",
        match: {},
      },
    };
  }

  private mapRule(rule?: Partial<PolicyRule>): PolicyRule {
    return {
      id: rule?.id || "OPA_EXTERNAL_RULE",
      priority: rule?.priority ?? 100,
      effect: rule?.effect || "allow",
      match: rule?.match || {},
      conditions: rule?.conditions || [],
      obligations: rule?.obligations || [],
    };
  }
}
