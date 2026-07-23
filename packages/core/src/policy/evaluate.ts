import type { PolicyCard, PolicyEvaluationResult } from "./types.js";

export interface PolicyContext {
  toolName: string;
  sideEffect: "read" | "write" | "submit";
}

export function evaluatePolicy(
  policy: PolicyCard,
  context: PolicyContext,
): PolicyEvaluationResult {
  
  // V2 Rule Evaluation (if appliesTo and rules exist)
  if (policy.appliesTo?.capabilities && policy.rules) {
    const matchesCapability = policy.appliesTo.capabilities.some(
      (cap) => cap === "*" || 
               context.toolName === cap || 
               (cap.endsWith("*") && context.toolName.startsWith(cap.replace("*", "")))
    );

    if (matchesCapability) {
      for (const rule of policy.rules) {
        // Evaluate first matching rule (no condition logic implemented yet, assume all match if no condition)
        if (!rule.condition) {
          if (rule.effect === "deny") {
            return {
              allowed: false,
              reason: `Tool '${context.toolName}' is denied by rule in policy '${policy.id || policy.metadata?.name}'.`,
            };
          }
          if (rule.effect === "require_approval") {
            return {
              allowed: true,
              requirements: {
                approvalRequired: true,
                evidenceRequired: policy.evidence?.required || [],
                piiHandling: policy.spec?.piiHandling || "deny",
              },
            };
          }
          if (rule.effect === "allow") {
            return {
              allowed: true,
              requirements: {
                approvalRequired: false,
                evidenceRequired: policy.evidence?.required || [],
                piiHandling: policy.spec?.piiHandling || "deny",
              },
            };
          }
        }
      }
    }
  }

  // V1 Rule Evaluation (Fallback)
  const spec = policy.spec;
  if (!spec) {
    return {
      allowed: true,
    };
  }

  // 1. Check if tool is explicitly forbidden
  if (
    spec.forbiddenTools.includes("*") ||
    spec.forbiddenTools.includes(context.toolName)
  ) {
    return {
      allowed: false,
      reason: `Tool '${context.toolName}' is explicitly forbidden by policy '${policy.metadata?.name}'.`,
    };
  }

  // 2. Check if tool is allowed
  const isAllowed =
    spec.allowedTools.includes("*") ||
    spec.allowedTools.includes(context.toolName);
  if (!isAllowed) {
    return {
      allowed: false,
      reason: `Tool '${context.toolName}' is not in the allowed list of policy '${policy.metadata?.name}'.`,
    };
  }

  // 3. Side Effect rules
  const sideEffectRules = spec.sideEffectRules || {
    read: "allow",
    write: "approval",
    submit: "approval",
  };
  const rule = sideEffectRules[context.sideEffect] || "deny";

  if (rule === "deny") {
    return {
      allowed: false,
      reason: `Side-effect level '${context.sideEffect}' is denied by policy '${policy.metadata?.name}'.`,
    };
  }

  const approvalRequiredByRule = rule === "approval";
  const approvalRequiredByList =
    spec.approvalRequirements.includes("*") ||
    spec.approvalRequirements.includes(context.toolName);

  const requiresApproval = approvalRequiredByRule || approvalRequiredByList;

  return {
    allowed: true, // It is allowed, but possibly with requirements
    requirements: {
      approvalRequired: requiresApproval,
      evidenceRequired: spec.evidenceRequirements || policy.evidence?.required || [],
      piiHandling: spec.piiHandling,
    },
  };
}
