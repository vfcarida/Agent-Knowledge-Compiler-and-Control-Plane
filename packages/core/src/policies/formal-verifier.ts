import {
  evaluatePolicies,
  type PolicyDecision,
  type PolicyRequest,
  type PolicyRule,
} from "./engine.js";
import type { PolicyCard } from "../policy/types.js";
import { adaptPolicyCardToRules } from "./adapter.js";

export type PolicyTargetInput =
  PolicyRule[] | PolicyCard | Record<string, PolicyCard>;

export interface PolicySafetyInvariant {
  id: string;
  description: string;
  /**
   * Returns true if the (request, decision) pair satisfies the safety invariant,
   * or false if the state is a counterexample (violation).
   */
  predicate: (request: PolicyRequest, decision: PolicyDecision) => boolean;
}

export interface PolicyCounterexample {
  invariantId: string;
  invariantDescription: string;
  state: PolicyRequest;
  decision: PolicyDecision;
  violatingRuleId: string;
}

export interface InvariantCheckSummary {
  id: string;
  description: string;
  passed: boolean;
  violations: number;
}

export interface PolicyVerificationReport {
  verified: boolean;
  statesExplored: number;
  invariantsChecked: number;
  invariantResults: InvariantCheckSummary[];
  counterexamples: PolicyCounterexample[];
}

export interface PolicyDivergingState {
  state: PolicyRequest;
  decisionA: PolicyDecision;
  decisionB: PolicyDecision;
}

export interface PolicyEquivalenceReport {
  equivalent: boolean;
  statesExplored: number;
  divergingStates: PolicyDivergingState[];
}

function hasApprovalObligation(decision: PolicyDecision): boolean {
  return decision.obligations.some((o) => o.type === "require_approval");
}

export const DEFAULT_SAFETY_INVARIANTS: PolicySafetyInvariant[] = [
  {
    id: "NO_UNAPPROVED_CRITICAL_EXECUTION",
    description:
      "Critical-risk capabilities must never be allowed without a require_approval obligation or an active approval token.",
    predicate: (req, decision) => {
      if (req.riskLevel === "critical" && !req.approvalToken) {
        if (decision.effect === "allow" && !hasApprovalObligation(decision)) {
          return false;
        }
      }
      return true;
    },
  },
  {
    id: "NO_UNAPPROVED_EXTERNAL_SUBMIT",
    description:
      "External submission side-effects ('submit') must never be allowed without a require_approval obligation or an active approval token.",
    predicate: (req, decision) => {
      if (req.sideEffect === "submit" && !req.approvalToken) {
        if (decision.effect === "allow" && !hasApprovalObligation(decision)) {
          return false;
        }
      }
      return true;
    },
  },
  {
    id: "PRODUCTION_HIGH_RISK_WRITE_GUARDED",
    description:
      "High or critical risk write operations in production must be denied or gated by require_approval when no approval token is present.",
    predicate: (req, decision) => {
      if (
        req.environment === "production" &&
        req.sideEffect === "write" &&
        (req.riskLevel === "high" || req.riskLevel === "critical") &&
        !req.approvalToken
      ) {
        if (decision.effect === "allow" && !hasApprovalObligation(decision)) {
          return false;
        }
      }
      return true;
    },
  },
];

export function normalizePolicyTarget(target: PolicyTargetInput): PolicyRule[] {
  if (Array.isArray(target)) {
    return target;
  }
  if ("rules" in target || "spec" in target) {
    return adaptPolicyCardToRules(target as PolicyCard);
  }
  const allRules: PolicyRule[] = [];
  for (const card of Object.values(target)) {
    allRules.push(...adaptPolicyCardToRules(card));
  }
  return allRules;
}

function buildFiniteStateSpace(rules: PolicyRule[]): PolicyRequest[] {
  const tools = new Set<string>([
    "read_document",
    "write_record",
    "submit_external",
    "unlisted_admin_tool",
  ]);
  const agents = new Set<string>(["agent-default"]);
  const environments = new Set<string>(["development", "production"]);
  const riskLevels = ["low", "medium", "high", "critical"];
  const sideEffects = ["read", "write", "submit"];

  for (const rule of rules) {
    for (const pattern of rule.match.tools ?? []) {
      if (pattern === "*") continue;
      if (pattern.includes("*")) {
        tools.add(pattern.replace(/\*/g, "sample"));
      } else {
        tools.add(pattern);
      }
    }
    for (const agent of rule.match.agents ?? []) {
      agents.add(agent);
    }
    for (const cond of rule.conditions ?? []) {
      if (
        cond.type === "environment" &&
        typeof cond.params.environment === "string"
      ) {
        environments.add(cond.params.environment);
      }
    }
  }

  const states: PolicyRequest[] = [];
  for (const tool of tools) {
    for (const agentId of agents) {
      for (const environment of environments) {
        for (const riskLevel of riskLevels) {
          for (const sideEffect of sideEffects) {
            for (const hasApproval of [false, true]) {
              states.push({
                tool,
                agentId,
                riskLevel,
                scopes: [],
                environment,
                sideEffect,
                approvalToken: hasApproval ? "tok_verified_formal" : undefined,
              });
            }
          }
        }
      }
    }
  }

  return states;
}

/**
 * Exhaustively explores the finite state space of policy requests against the
 * provided PolicyRule set or PolicyCard(s) to formally verify safety invariants.
 */
export function verifyPolicyInvariants(
  target: PolicyTargetInput,
  invariants: PolicySafetyInvariant[] = DEFAULT_SAFETY_INVARIANTS,
): PolicyVerificationReport {
  const rules = normalizePolicyTarget(target);
  const states = buildFiniteStateSpace(rules);
  const counterexamples: PolicyCounterexample[] = [];
  const violationCounts = new Map<string, number>();

  for (const inv of invariants) {
    violationCounts.set(inv.id, 0);
  }

  for (const state of states) {
    const decision = evaluatePolicies(rules, state);
    for (const inv of invariants) {
      const ok = inv.predicate(state, decision);
      if (!ok) {
        violationCounts.set(inv.id, (violationCounts.get(inv.id) ?? 0) + 1);
        counterexamples.push({
          invariantId: inv.id,
          invariantDescription: inv.description,
          state,
          decision,
          violatingRuleId: decision.matchedRule.id,
        });
      }
    }
  }

  const invariantResults: InvariantCheckSummary[] = invariants.map((inv) => {
    const violations = violationCounts.get(inv.id) ?? 0;
    return {
      id: inv.id,
      description: inv.description,
      passed: violations === 0,
      violations,
    };
  });

  return {
    verified: counterexamples.length === 0,
    statesExplored: states.length,
    invariantsChecked: invariants.length,
    invariantResults,
    counterexamples,
  };
}

/**
 * Proves whether two policy sets are semantically equivalent across 100% of
 * their combined finite state space, or produces concrete diverging counterexample states.
 */
export function provePolicyEquivalence(
  targetA: PolicyTargetInput,
  targetB: PolicyTargetInput,
): PolicyEquivalenceReport {
  const rulesA = normalizePolicyTarget(targetA);
  const rulesB = normalizePolicyTarget(targetB);
  const states = buildFiniteStateSpace([...rulesA, ...rulesB]);
  const divergingStates: PolicyDivergingState[] = [];

  for (const state of states) {
    const decisionA = evaluatePolicies(rulesA, state);
    const decisionB = evaluatePolicies(rulesB, state);

    const obsA = decisionA.obligations
      .map((o) => o.type)
      .sort()
      .join(",");
    const obsB = decisionB.obligations
      .map((o) => o.type)
      .sort()
      .join(",");

    if (decisionA.effect !== decisionB.effect || obsA !== obsB) {
      divergingStates.push({
        state,
        decisionA,
        decisionB,
      });
    }
  }

  return {
    equivalent: divergingStates.length === 0,
    statesExplored: states.length,
    divergingStates,
  };
}
