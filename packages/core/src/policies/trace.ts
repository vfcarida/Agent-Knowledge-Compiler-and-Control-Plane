import type { PolicyRequest, PolicyDecision, PolicyRule } from "./engine.js";

export interface PolicyTrace {
  request: PolicyRequest;
  evaluatedRules: RuleEvaluation[];
  decision: PolicyDecision;
  conflicts: PolicyConflict[];
  timestamp: string;
}

export interface RuleEvaluation {
  rule: PolicyRule;
  matched: boolean;
  conditionsMet: boolean;
  skipReason?: string;
}

export interface PolicyConflict {
  allowRule: PolicyRule;
  denyRule: PolicyRule;
  resolution: "deny-wins" | "priority-wins";
  explanation: string;
}
