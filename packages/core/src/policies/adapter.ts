import type { PolicyCard } from "../policy/types.js";
import type { PolicyRule, PolicyObligation } from "./engine.js";

export function adaptPolicyCardToRules(policy: PolicyCard): PolicyRule[] {
  const rules: PolicyRule[] = [];
  let priority = 100; // start at 100

  const piiHandling = policy.spec?.piiHandling || "deny";
  const obligations: PolicyObligation[] = [];
  if (piiHandling === "redact") obligations.push({ type: "pii_redact" });
  if (piiHandling === "deny") obligations.push({ type: "pii_deny" });

  const baseId = policy.id || policy.metadata?.name || "unknown-policy";

  // V2 Rules
  if (policy.appliesTo?.capabilities && policy.rules) {
    const scopes = policy.appliesTo.capabilities;
    for (const rule of policy.rules) {
      if (rule.effect === "deny") {
        rules.push({
          id: `${baseId}-v2-deny-${priority}`,
          priority: priority++,
          effect: "deny",
          match: { tools: scopes },
          description: `V2 Deny rule from ${policy.metadata?.name}`,
        });
      } else {
        const obs = [...obligations];
        if (rule.effect === "require_approval")
          obs.push({ type: "require_approval" });
        rules.push({
          id: `${baseId}-v2-allow-${priority}`,
          priority: priority++,
          effect: "allow",
          match: { tools: scopes },
          obligations: obs,
          description: `V2 Allow rule from ${policy.metadata?.name}`,
        });
      }
    }
  }

  const spec = policy.spec;
  if (!spec) return rules;

  // 1. Forbidden tools -> High priority deny
  if (spec.forbiddenTools && spec.forbiddenTools.length > 0) {
    rules.push({
      id: `${baseId}-forbidden-tools`,
      priority: priority++,
      effect: "deny",
      match: { tools: spec.forbiddenTools },
      description: `Forbidden tools from ${policy.metadata?.name}`,
    });
  }

  // Approval requirements per tool (overrides side effect if specific)
  if (spec.approvalRequirements && spec.approvalRequirements.length > 0) {
    const obs = [...obligations, { type: "require_approval" as const }];
    rules.push({
      id: `${baseId}-approval-reqs`,
      priority: priority++,
      effect: "allow",
      match: { tools: spec.approvalRequirements },
      obligations: obs,
      description: `Approval requirements from ${policy.metadata?.name}`,
    });
  }

  // 2. Side Effect Rules
  const sideEffectRules = spec.sideEffectRules || {
    read: "allow",
    write: "approval",
    submit: "approval",
  };

  const mapSideEffect = (effect: string, action: string) => {
    if (action === "deny") {
      rules.push({
        id: `${baseId}-sideeffect-deny-${effect}`,
        priority: priority++,
        effect: "deny",
        match: { tools: spec.allowedTools, sideEffects: [effect] },
      });
    } else {
      const obs = [...obligations];
      if (action === "approval") obs.push({ type: "require_approval" });
      rules.push({
        id: `${baseId}-sideeffect-allow-${effect}`,
        priority: priority++,
        effect: "allow",
        match: { tools: spec.allowedTools, sideEffects: [effect] },
        obligations: obs,
      });
    }
  };

  mapSideEffect("read", sideEffectRules.read);
  mapSideEffect("write", sideEffectRules.write);
  mapSideEffect("submit", sideEffectRules.submit);

  return rules;
}
