import type { PolicyRule, PolicyMatcher, PolicyCondition } from "./engine.js";
import type { PolicyCard } from "../policy/types.js";
import { adaptPolicyCardToRules } from "./adapter.js";

export type PolicyLintSeverity = "error" | "warning" | "info";
export type PolicyLintCode =
  "SHADOWED_RULE" | "CONTRADICTORY_RULE" | "REDUNDANT_RULE";

export interface PolicyLintIssue {
  code: PolicyLintCode;
  severity: PolicyLintSeverity;
  ruleId: string;
  targetRuleId?: string;
  message: string;
}

export interface PolicyLintResult {
  valid: boolean;
  issues: PolicyLintIssue[];
}

/**
 * Checks whether pattern A subsumes (covers) pattern B.
 * E.g., "*" covers "read_*", "read_*" covers "read_file", "read_file" covers "read_file".
 */
export function patternSubsumes(patternA: string, patternB: string): boolean {
  if (patternA === "*") return true;
  if (patternA === patternB) return true;

  if (patternA.endsWith("*")) {
    const prefix = patternA.slice(0, -1);
    if (patternB.endsWith("*")) {
      const bPrefix = patternB.slice(0, -1);
      return bPrefix.startsWith(prefix);
    }
    return patternB.startsWith(prefix);
  }

  return false;
}

/**
 * Checks whether tool list A covers all tools matched by list B.
 */
function toolsSubsume(
  toolsA: string[] | undefined,
  toolsB: string[] | undefined,
): boolean {
  // If A is undefined or empty, it matches any tool
  if (!toolsA || toolsA.length === 0 || toolsA.includes("*")) return true;
  // If B is undefined or has "*", but A does not cover all, then A does not cover B
  if (!toolsB || toolsB.length === 0 || toolsB.includes("*")) return false;

  // Every tool in B must be subsumed by at least one pattern in A
  return toolsB.every((b) => toolsA.some((a) => patternSubsumes(a, b)));
}

/**
 * Checks whether set A is a superset of set B.
 * If A is undefined/empty, it imposes no restriction (universal match).
 */
function arraySubsumes(
  listA: string[] | undefined,
  listB: string[] | undefined,
): boolean {
  if (!listA || listA.length === 0) return true;
  if (!listB || listB.length === 0) return false;
  const setA = new Set(listA);
  return listB.every((item) => setA.has(item));
}

/**
 * Checks whether matcher A covers all requests that matcher B could match.
 */
export function matcherSubsumes(
  matcherA: PolicyMatcher,
  matcherB: PolicyMatcher,
): boolean {
  if (!toolsSubsume(matcherA.tools, matcherB.tools)) return false;
  if (!arraySubsumes(matcherA.agents, matcherB.agents)) return false;
  if (!arraySubsumes(matcherA.riskLevels, matcherB.riskLevels)) return false;
  if (!arraySubsumes(matcherA.sideEffects, matcherB.sideEffects)) return false;

  // Scopes: rule A matches if request has all scopes in matcherA.scopes.
  // So if matcherA requires fewer scopes than matcherB, A will match whenever B matches.
  if (matcherA.scopes && matcherA.scopes.length > 0) {
    if (!matcherB.scopes || matcherB.scopes.length === 0) return false;
    const bScopes = new Set(matcherB.scopes);
    if (!matcherA.scopes.every((s) => bScopes.has(s))) return false;
  }

  return true;
}

/**
 * Checks whether condition sets are effectively identical or empty.
 */
function conditionsAreEquivalent(
  condA: PolicyCondition[] | undefined,
  condB: PolicyCondition[] | undefined,
): boolean {
  const lenA = condA?.length || 0;
  const lenB = condB?.length || 0;
  if (lenA === 0 && lenB === 0) return true;
  if (lenA !== lenB) return false;
  return JSON.stringify(condA) === JSON.stringify(condB);
}

/**
 * Lints a list of PolicyRule objects for potential security issues, shadowing, and contradictions.
 */
export function lintPolicyRules(rules: PolicyRule[]): PolicyLintResult {
  const issues: PolicyLintIssue[] = [];

  // Sort rules in evaluation order (ascending priority)
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  for (let i = 0; i < sorted.length; i++) {
    const ruleA = sorted[i];
    if (!ruleA) continue;

    for (let j = i + 1; j < sorted.length; j++) {
      const ruleB = sorted[j];
      if (!ruleB) continue;

      // Case 1: Contradictory rules at the exact same priority
      if (ruleA.priority === ruleB.priority) {
        const matchesSameTools =
          matcherSubsumes(ruleA.match, ruleB.match) &&
          matcherSubsumes(ruleB.match, ruleA.match);

        if (
          matchesSameTools &&
          conditionsAreEquivalent(ruleA.conditions, ruleB.conditions) &&
          ruleA.effect !== ruleB.effect
        ) {
          issues.push({
            code: "CONTRADICTORY_RULE",
            severity: "error",
            ruleId: ruleA.id,
            targetRuleId: ruleB.id,
            message: `Contradictory rules at priority ${ruleA.priority}: '${ruleA.id}' (${ruleA.effect}) and '${ruleB.id}' (${ruleB.effect}) have opposing effects for identical matchers.`,
          });
        }
        continue;
      }

      // Case 2: Rule A has strictly higher priority (lower priority number) than Rule B
      if (ruleA.priority < ruleB.priority) {
        const aSubsumesB = matcherSubsumes(ruleA.match, ruleB.match);
        const aHasNoConditions =
          !ruleA.conditions || ruleA.conditions.length === 0;
        const sameConditions = conditionsAreEquivalent(
          ruleA.conditions,
          ruleB.conditions,
        );

        if (aSubsumesB && (aHasNoConditions || sameConditions)) {
          if (ruleA.effect !== ruleB.effect) {
            issues.push({
              code: "SHADOWED_RULE",
              severity: "error",
              ruleId: ruleB.id,
              targetRuleId: ruleA.id,
              message: `Rule '${ruleB.id}' (${ruleB.effect}, priority ${ruleB.priority}) is shadowed by higher-priority rule '${ruleA.id}' (${ruleA.effect}, priority ${ruleA.priority}). Rule '${ruleB.id}' will never be evaluated.`,
            });
          } else {
            issues.push({
              code: "REDUNDANT_RULE",
              severity: "warning",
              ruleId: ruleB.id,
              targetRuleId: ruleA.id,
              message: `Rule '${ruleB.id}' is redundant and unreachable because higher-priority rule '${ruleA.id}' already matches all requests with effect '${ruleA.effect}'.`,
            });
          }
        }
      }
    }
  }

  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    issues,
  };
}

/**
 * Lints an individual PolicyCard by adapting it to runtime rules and analyzing conflicts.
 */
export function lintPolicyCard(card: PolicyCard): PolicyLintResult {
  const rules = adaptPolicyCardToRules(card);
  return lintPolicyRules(rules);
}

/**
 * Lints a collection of policy cards or rules.
 */
export function lintPolicies(
  target: PolicyCard | PolicyRule[] | Record<string, PolicyCard>,
): PolicyLintResult {
  if (Array.isArray(target)) {
    return lintPolicyRules(target);
  }

  if ("rules" in target || "spec" in target) {
    return lintPolicyCard(target as PolicyCard);
  }

  const allRules: PolicyRule[] = [];
  for (const card of Object.values(target)) {
    allRules.push(...adaptPolicyCardToRules(card));
  }
  return lintPolicyRules(allRules);
}
