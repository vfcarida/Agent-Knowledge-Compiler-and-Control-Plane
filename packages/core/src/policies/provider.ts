import type { PolicyRule, PolicyRequest, PolicyDecision } from "./engine.js";
import type { PolicyTrace } from "./trace.js";

/**
 * PolicyProvider abstracts the policy evaluation engine.
 * Default: InternalPolicyProvider (built-in rule engine)
 * Optional: OPAPolicyProvider, CedarPolicyProvider, OpenFGAPolicyProvider
 */
export interface PolicyProvider {
  /**
   * Evaluate a request against loaded policies.
   * Returns decision with explanation.
   */
  evaluate(request: PolicyRequest): Promise<PolicyDecision>;

  /**
   * Explain why a decision was made (for audit/debug).
   * May return null if provider doesn't support explain.
   */
  explain?(request: PolicyRequest): Promise<PolicyTrace | null>;

  /**
   * Load/reload policies from source.
   * Called on startup and on policy file change.
   */
  reload(source: PolicySource): Promise<void>;

  /**
   * Health check for the provider.
   */
  healthy(): Promise<boolean>;
}

export interface PolicySource {
  type: "file" | "directory" | "url" | "inline";
  path?: string;
  policies?: PolicyRule[];
}
