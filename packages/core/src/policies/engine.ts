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
  type:
    | "time_window"
    | "environment"
    | "approval_exists"
    | "expression"
    | "custom"
    | "unknown";
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
      case "expression":
        return evaluateExpressionCondition(condition.params, request);
      case "custom":
        // Not implemented in MVP, assume true or pass to a plugin system
        return true;
      default:
        return false; // Unknown condition type = deny
    }
  });
}

function evaluateExpressionCondition(
  params: Record<string, unknown>,
  request: PolicyRequest,
): boolean {
  if (params.field && params.op) {
    const field = String(params.field);
    const op = String(params.op);
    const expected = params.value;
    const actual = resolveRequestField(field, request);
    return compareValues(actual, op, expected);
  }

  if (typeof params.expr === "string") {
    return evaluateExpressionString(params.expr, request);
  }

  return false;
}

function resolveRequestField(field: string, request: PolicyRequest): unknown {
  switch (field.toLowerCase()) {
    case "environment":
    case "env":
      return request.environment;
    case "risklevel":
      return request.riskLevel;
    case "tool":
    case "toolname":
      return request.tool;
    case "agentid":
      return request.agentId;
    case "sideeffect":
      return request.sideEffect;
    case "approvaltoken":
      return request.approvalToken;
    default:
      return undefined;
  }
}

function compareValues(
  actual: unknown,
  op: string,
  expected: unknown,
): boolean {
  switch (op) {
    case "==":
    case "=":
      return actual === expected || String(actual) === String(expected);
    case "!=":
      return actual !== expected && String(actual) !== String(expected);
    case "<":
      return Number(actual) < Number(expected);
    case "<=":
      return Number(actual) <= Number(expected);
    case ">":
      return Number(actual) > Number(expected);
    case ">=":
      return Number(actual) >= Number(expected);
    default:
      return false;
  }
}

function evaluateExpressionString(
  expr: string,
  request: PolicyRequest,
): boolean {
  const match = expr.trim().match(/^([a-zA-Z_]+)\s*(==|!=|<=|>=|<|>)\s*(.*)$/);
  if (!match) return false;
  const [, field, op, rawVal] = match;
  if (!field || !op || rawVal === undefined) return false;
  let parsedVal: unknown = rawVal.trim();
  if (
    (typeof parsedVal === "string" &&
      parsedVal.startsWith("'") &&
      parsedVal.endsWith("'")) ||
    (typeof parsedVal === "string" &&
      parsedVal.startsWith('"') &&
      parsedVal.endsWith('"'))
  ) {
    parsedVal = (parsedVal as string).slice(1, -1);
  } else if (parsedVal === "true") {
    parsedVal = true;
  } else if (parsedVal === "false") {
    parsedVal = false;
  } else if (!isNaN(Number(parsedVal))) {
    parsedVal = Number(parsedVal);
  }
  const actual = resolveRequestField(field, request);
  return compareValues(actual, op, parsedVal);
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
        skipReason: condMet ? undefined : "Conditions not met",
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
