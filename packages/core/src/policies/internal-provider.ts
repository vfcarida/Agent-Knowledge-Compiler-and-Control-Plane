import { evaluatePolicies, evaluatePoliciesWithTrace } from "./engine.js";
import type { PolicyRule, PolicyRequest, PolicyDecision } from "./engine.js";
import type { PolicyTrace } from "./trace.js";
import type { PolicyProvider, PolicySource } from "./provider.js";

export class InternalPolicyProvider implements PolicyProvider {
  private rules: PolicyRule[] = [];

  async evaluate(request: PolicyRequest): Promise<PolicyDecision> {
    return evaluatePolicies(this.rules, request);
  }

  async explain(request: PolicyRequest): Promise<PolicyTrace> {
    const { trace } = evaluatePoliciesWithTrace(this.rules, request);
    return trace;
  }

  async reload(source: PolicySource): Promise<void> {
    if (source.policies) {
      this.rules = source.policies;
    }
  }

  async healthy(): Promise<boolean> {
    return true; // Always healthy — no external deps
  }
}
