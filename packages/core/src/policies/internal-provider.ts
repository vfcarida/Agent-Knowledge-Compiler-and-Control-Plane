import { evaluatePolicies, evaluatePoliciesWithTrace } from "./engine.js";
import type { PolicyRule, PolicyRequest, PolicyDecision } from "./engine.js";
import type { PolicyTrace } from "./trace.js";
import type { PolicyProvider, PolicySource } from "./provider.js";
import type { PolicyCard } from "../policy/types.js";
import { adaptPolicyCardToRules } from "./adapter.js";

export class InternalPolicyProvider implements PolicyProvider {
  private rules: PolicyRule[] = [];

  constructor(rulesOrPolicy?: PolicyRule[] | PolicyCard) {
    if (Array.isArray(rulesOrPolicy)) {
      this.rules = rulesOrPolicy;
    } else if (rulesOrPolicy) {
      this.rules = adaptPolicyCardToRules(rulesOrPolicy);
    }
  }

  public getRules(): PolicyRule[] {
    return [...this.rules];
  }

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
    } else if (source.policyCard) {
      this.rules = adaptPolicyCardToRules(source.policyCard);
    }
  }

  async healthy(): Promise<boolean> {
    return true; // Always healthy — no external deps
  }
}
