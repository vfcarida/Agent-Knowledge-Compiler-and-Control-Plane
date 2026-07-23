export interface PolicyRule {
  id: string;
  description?: string;
  priority: number; // lower = higher priority (0 = highest)
  effect: "allow" | "deny";
  match: PolicyMatcher;
  conditions?: PolicyCondition[];
  obligations?: PolicyObligation[]; // side-effects on allow (e.g., require HITL)
}

export interface PolicyMatcher {
  tools?: string[]; // glob patterns: ['read_*', 'list_*']
  agents?: string[]; // agent IDs
  riskLevels?: string[]; // ['low', 'medium']
  scopes?: string[]; // required scopes
  sideEffects?: string[]; // ['read', 'write', 'submit', 'none']
}

export interface PolicyCondition {
  type: "time_window" | "environment" | "approval_exists" | "custom";
  params: Record<string, unknown>;
}

export interface PolicyObligation {
  type:
    | "require_approval"
    | "log_audit"
    | "rate_limit"
    | "notify"
    | "pii_redact"
    | "pii_deny";
  params?: Record<string, unknown>;
}

export interface PolicyDecision {
  effect: "allow" | "deny";
  matchedRule: PolicyRule;
  obligations: PolicyObligation[];
  reason: string;
}

export interface PolicyRequest {
  tool: string;
  agentId: string;
  riskLevel: string;
  scopes: string[];
  approvalToken?: string;
  environment?: string; // Optional context
  sideEffect?: string;
}

const DEFAULT_DENY_RULE: PolicyRule = {
  id: "DEFAULT_DENY",
  priority: 9999,
  effect: "deny",
  match: {},
  description: "Closed-world default deny rule",
};

export function evaluatePolicies(
  rules: PolicyRule[],
  request: PolicyRequest,
): PolicyDecision {
  // Sort by priority (lower number = higher priority)
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    if (
      matchesRule(rule, request) &&
      meetsConditions(rule.conditions, request)
    ) {
      return {
        effect: rule.effect,
        matchedRule: rule,
        obligations: rule.obligations ?? [],
        reason: `Matched rule "${rule.id}" (priority ${rule.priority})`,
      };
    }
  }

  // Default deny (closed-world assumption)
  return {
    effect: "deny",
    matchedRule: DEFAULT_DENY_RULE,
    obligations: [],
    reason: "No matching rule found. Default: deny.",
  };
}

function globMatch(pattern: string, target: string): boolean {
  if (pattern === "*") return true;
  if (!pattern.includes("*")) return pattern === target;

  // Escape regex special chars except *
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");

  return new RegExp(`^${regexPattern}$`).test(target);
}

export function matchesRule(rule: PolicyRule, request: PolicyRequest): boolean {
  const { match } = rule;

  if (
    match.tools &&
    !match.tools.some((pattern) => globMatch(pattern, request.tool))
  ) {
    return false;
  }
  if (match.agents && !match.agents.includes(request.agentId)) {
    return false;
  }
  if (match.riskLevels && !match.riskLevels.includes(request.riskLevel)) {
    return false;
  }
  if (match.scopes && !match.scopes.every((s) => request.scopes.includes(s))) {
    return false;
  }
  if (
    match.sideEffects &&
    request.sideEffect &&
    !match.sideEffects.includes(request.sideEffect)
  ) {
    return false;
  }

  return true;
}

export function meetsConditions(
  conditions: PolicyCondition[] | undefined,
  request: PolicyRequest,
): boolean {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every((condition) => {
    switch (condition.type) {
      case "time_window":
        return isWithinTimeWindow(
          condition.params as { startHour?: number; endHour?: number },
        );
      case "environment":
        return request.environment === condition.params.environment;
      case "approval_exists":
        return request.approvalToken != null;
      case "custom":
        // Not implemented in MVP, assume true or pass to a plugin system
        return true;
      default:
        return false; // Unknown condition type = deny
    }
  });
}

function isWithinTimeWindow(params: {
  startHour?: number;
  endHour?: number;
}): boolean {
  const currentHour = new Date().getHours();
  if (params.startHour !== undefined && currentHour < params.startHour)
    return false;
  if (params.endHour !== undefined && currentHour >= params.endHour)
    return false;
  return true;
}

import type { PolicyTrace, RuleEvaluation, PolicyConflict } from "./trace.js";

export function evaluatePoliciesWithTrace(
  rules: PolicyRule[],
  request: PolicyRequest,
): { decision: PolicyDecision; trace: PolicyTrace } {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  const evaluatedRules: RuleEvaluation[] = [];
  const conflicts: PolicyConflict[] = [];

  let finalDecision: PolicyDecision | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const rule = sorted[i]!;

    const ruleMatched = matchesRule(rule, request);
    let condMet = false;

    if (ruleMatched) {
      condMet = meetsConditions(rule.conditions, request);
      evaluatedRules.push({
        rule,
        matched: true,
        conditionsMet: condMet,
      });

      if (condMet && !finalDecision) {
        finalDecision = {
          effect: rule.effect,
          matchedRule: rule,
          obligations: rule.obligations ?? [],
          reason: `Matched rule "${rule.id}" (priority ${rule.priority})`,
        };

        // Check for conflicts
        for (let j = i + 1; j < sorted.length; j++) {
          const lowerRule = sorted[j]!;

          if (
            lowerRule.effect !== rule.effect &&
            matchesRule(lowerRule, request) &&
            meetsConditions(lowerRule.conditions, request)
          ) {
            conflicts.push({
              allowRule: rule.effect === "allow" ? rule : lowerRule,
              denyRule: rule.effect === "deny" ? rule : lowerRule,
              resolution: "priority-wins",
              explanation: `Higher priority rule ${rule.id} won over ${lowerRule.id}`,
            });
            break;
          }
        }
      }
    } else {
      evaluatedRules.push({
        rule,
        matched: false,
        conditionsMet: false,
        skipReason: "Match criteria failed",
      });
    }
  }

  if (!finalDecision) {
    finalDecision = {
      effect: "deny",
      matchedRule: DEFAULT_DENY_RULE,
      obligations: [],
      reason: "No matching rule found. Default: deny.",
    };
  }

  return {
    decision: finalDecision,
    trace: {
      request,
      evaluatedRules,
      decision: finalDecision,
      conflicts,
      timestamp: new Date().toISOString(),
    },
  };
}
