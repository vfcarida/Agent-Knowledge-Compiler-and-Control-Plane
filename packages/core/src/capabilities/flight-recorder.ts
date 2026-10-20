import fs from "node:fs";
import path from "node:path";
import { evaluatePolicies, type PolicyRequest } from "../policies/engine.js";
import {
  normalizePolicyTarget,
  type PolicyTargetInput,
} from "../policies/formal-verifier.js";

export interface FlightLogEntry {
  requestId: string;
  timestamp: string;
  request: PolicyRequest;
  payloadHash: string;
  originalDecision: {
    effect: "allow" | "deny";
    requiresApproval: boolean;
    obligations: string[];
    reason: string;
  };
}

export type ReplayDivergenceKind =
  "NEWLY_BLOCKED" | "NEWLY_GATED_HITL" | "PRIVILEGE_RELAXED" | "HITL_REMOVED";

export interface PolicyReplayDivergence {
  requestId: string;
  tool: string;
  agentId: string;
  riskLevel: string;
  sideEffect?: string;
  originalEffect: "allow" | "deny";
  candidateEffect: "allow" | "deny";
  originalRequiresApproval: boolean;
  candidateRequiresApproval: boolean;
  divergenceKind: ReplayDivergenceKind;
  explanation: string;
}

export interface PolicyReplayReport {
  totalReplayed: number;
  identicalDecisions: number;
  divergentDecisions: number;
  hasPrivilegeRelaxations: boolean;
  hasBreakingBlocks: boolean;
  divergences: PolicyReplayDivergence[];
}

/**
 * Deterministic Execution Flight Recorder for MCPGateway invocations.
 * Captures normalized PolicyRequest envelopes and decisions so operators can
 * perform Time-Travel Policy Replay ("What-If" simulation) against candidate PolicyCards.
 */
export class ExecutionFlightRecorder {
  private entries: FlightLogEntry[] = [];

  public record(entry: FlightLogEntry): void {
    this.entries.push(entry);
  }

  public getEntries(): FlightLogEntry[] {
    return [...this.entries];
  }

  public clear(): void {
    this.entries = [];
  }

  public saveToFile(filePath: string): void {
    const resolved = path.resolve(filePath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, JSON.stringify(this.entries, null, 2), "utf-8");
  }

  public static loadFromFile(filePath: string): FlightLogEntry[] {
    const resolved = path.resolve(filePath);
    const raw = fs.readFileSync(resolved, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("Flight log file must contain a JSON array of entries.");
    }
    return parsed as FlightLogEntry[];
  }

  public replayAgainstPolicy(
    candidateTarget: PolicyTargetInput,
  ): PolicyReplayReport {
    return replayFlightLogAgainstPolicy(this.entries, candidateTarget);
  }
}

/**
 * Replays historical FlightLogEntry traces against a candidate PolicyCard or PolicyRule[]
 * and classifies decision divergences (Privilege Relaxations, HITL Removal, Newly Blocked, Newly Gated).
 */
export function replayFlightLogAgainstPolicy(
  entries: FlightLogEntry[],
  candidateTarget: PolicyTargetInput,
): PolicyReplayReport {
  const candidateRules = normalizePolicyTarget(candidateTarget);
  const divergences: PolicyReplayDivergence[] = [];

  for (const entry of entries) {
    // Strip any historical approval token so we evaluate the candidate policy's raw stance
    const cleanRequest: PolicyRequest = {
      ...entry.request,
      approvalToken: undefined,
    };

    const candidateDecision = evaluatePolicies(candidateRules, cleanRequest);
    const candidateRequiresApproval = candidateDecision.obligations.some(
      (o) => o.type === "require_approval",
    );

    const origEff = entry.originalDecision.effect;
    const candEff = candidateDecision.effect;
    const origHitl = entry.originalDecision.requiresApproval;
    const candHitl = candidateRequiresApproval;

    if (origEff === candEff && origHitl === candHitl) {
      continue;
    }

    let divergenceKind: ReplayDivergenceKind;
    let explanation: string;

    if (origEff === "deny" && candEff === "allow") {
      divergenceKind = "PRIVILEGE_RELAXED";
      explanation = `Previously DENIED call to '${entry.request.tool}' by '${entry.request.agentId}' would now be ALLOWED${candHitl ? " (with HITL gate)" : " unconditionally"}.`;
    } else if (origEff === "allow" && candEff === "deny") {
      divergenceKind = "NEWLY_BLOCKED";
      explanation = `Previously ALLOWED call to '${entry.request.tool}' by '${entry.request.agentId}' would now be DENIED (${candidateDecision.reason}).`;
    } else if (origHitl && !candHitl) {
      divergenceKind = "HITL_REMOVED";
      explanation = `Previously HITL-gated call to '${entry.request.tool}' by '${entry.request.agentId}' would now execute WITHOUT human approval.`;
    } else {
      divergenceKind = "NEWLY_GATED_HITL";
      explanation = `Previously un-gated call to '${entry.request.tool}' by '${entry.request.agentId}' would now require HITL approval.`;
    }

    divergences.push({
      requestId: entry.requestId,
      tool: entry.request.tool,
      agentId: entry.request.agentId,
      riskLevel: entry.request.riskLevel,
      sideEffect: entry.request.sideEffect,
      originalEffect: origEff,
      candidateEffect: candEff,
      originalRequiresApproval: origHitl,
      candidateRequiresApproval: candHitl,
      divergenceKind,
      explanation,
    });
  }

  const identicalDecisions = entries.length - divergences.length;

  return {
    totalReplayed: entries.length,
    identicalDecisions,
    divergentDecisions: divergences.length,
    hasPrivilegeRelaxations: divergences.some(
      (d) =>
        d.divergenceKind === "PRIVILEGE_RELAXED" ||
        d.divergenceKind === "HITL_REMOVED",
    ),
    hasBreakingBlocks: divergences.some(
      (d) => d.divergenceKind === "NEWLY_BLOCKED",
    ),
    divergences,
  };
}
