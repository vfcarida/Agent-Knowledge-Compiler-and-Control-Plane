import type {
  AgentKnowledgeIR,
  IRConcept,
  IRLink,
  Capability,
} from "../ir/types.js";
import type {
  SemanticDiffResult,
  SemanticDiffOptions,
  ConceptDiff,
  PolicyDiff,
  CapabilityDiff,
  FieldChange,
  DiffSummary,
} from "./types.js";

const RISK_LEVEL_ORDER: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const SIDE_EFFECT_ORDER: Record<string, number> = {
  none: 0,
  "external-read": 1,
  "local-write": 2,
  "external-write": 3,
  "external-submit": 4,
};

const AUTONOMY_LEVEL_ORDER: Record<string, number> = {
  "read-only": 1,
  "read-write": 2,
  autonomous: 3,
};

export class SemanticDiffEngine {
  constructor(private options: SemanticDiffOptions = {}) {}

  /**
   * Compares a base IR with a target IR and computes semantic, policy, and capability differences.
   */
  diff(
    baseIR: AgentKnowledgeIR,
    targetIR: AgentKnowledgeIR,
  ): SemanticDiffResult {
    const breakingReasons: string[] = [];

    // 1. Concepts Diffing
    const baseConceptsMap = new Map<string, IRConcept>(
      baseIR.concepts.map((c) => [c.conceptId, c]),
    );
    const targetConceptsMap = new Map<string, IRConcept>(
      targetIR.concepts.map((c) => [c.conceptId, c]),
    );

    const addedConcepts: IRConcept[] = [];
    const removedConcepts: IRConcept[] = [];
    const modifiedConcepts: ConceptDiff[] = [];

    for (const [id, targetConcept] of targetConceptsMap.entries()) {
      const baseConcept = baseConceptsMap.get(id);
      if (!baseConcept) {
        addedConcepts.push(targetConcept);
      } else {
        const changes: FieldChange[] = [];

        // Check body/hash
        const baseHash = baseConcept.source?.hash;
        const targetHash = targetConcept.source?.hash;
        if (baseHash && targetHash && baseHash !== targetHash) {
          changes.push({
            field: "contentHash",
            oldValue: baseHash,
            newValue: targetHash,
          });
        } else if (baseConcept.body !== targetConcept.body) {
          changes.push({
            field: "body",
            oldValue: `length:${baseConcept.body.length}`,
            newValue: `length:${targetConcept.body.length}`,
          });
        }

        // Check lifecycle status
        if (baseConcept.status !== targetConcept.status) {
          changes.push({
            field: "status",
            oldValue: baseConcept.status,
            newValue: targetConcept.status,
          });
          if (
            targetConcept.status === "deprecated" ||
            targetConcept.status === "archived"
          ) {
            breakingReasons.push(
              `Concept '${id}' status transitioned from '${baseConcept.status || "active"}' to '${targetConcept.status}'.`,
            );
          }
        }

        // Check token budget shift
        if (
          baseConcept.budget?.estimatedTokens !==
          targetConcept.budget?.estimatedTokens
        ) {
          changes.push({
            field: "estimatedTokens",
            oldValue: baseConcept.budget?.estimatedTokens,
            newValue: targetConcept.budget?.estimatedTokens,
          });
        }

        // Check frontmatter differences
        const baseFm = baseConcept.frontmatter || {};
        const targetFm = targetConcept.frontmatter || {};
        const allFmKeys = new Set([
          ...Object.keys(baseFm),
          ...Object.keys(targetFm),
        ]);
        for (const key of allFmKeys) {
          const valA = JSON.stringify(baseFm[key]);
          const valB = JSON.stringify(targetFm[key]);
          if (valA !== valB) {
            changes.push({
              field: `frontmatter.${key}`,
              oldValue: baseFm[key],
              newValue: targetFm[key],
            });
          }
        }

        if (changes.length > 0) {
          modifiedConcepts.push({
            conceptId: id,
            changeType: "modified",
            title: (targetConcept.frontmatter?.title as string) || id,
            sourceFile: targetConcept.source?.filePath,
            changes,
          });
        }
      }
    }

    for (const [id, baseConcept] of baseConceptsMap.entries()) {
      if (!targetConceptsMap.has(id)) {
        removedConcepts.push(baseConcept);
        breakingReasons.push(
          `Concept '${id}' (${baseConcept.source?.filePath || "unknown"}) was removed from knowledge bundle.`,
        );
      }
    }

    // 2. Links Diffing
    const baseLinks = baseIR.links || [];
    const targetLinks = targetIR.links || [];

    const linkKey = (l: IRLink) =>
      `${l.sourceConceptId}==[${l.relationType}]==>${l.targetConceptId}`;

    const baseLinksSet = new Set(baseLinks.map(linkKey));
    const targetLinksSet = new Set(targetLinks.map(linkKey));

    const addedLinks: IRLink[] = [];
    const removedLinks: IRLink[] = [];
    const brokenLinks: IRLink[] = [];

    for (const link of targetLinks) {
      if (!baseLinksSet.has(linkKey(link))) {
        addedLinks.push(link);
      }
      // Check if target concept exists in target IR
      if (!targetConceptsMap.has(link.targetConceptId)) {
        brokenLinks.push(link);
        if (this.options.strictLinks !== false) {
          breakingReasons.push(
            `Broken link: concept '${link.sourceConceptId}' references nonexistent target '${link.targetConceptId}'.`,
          );
        }
      }
    }

    for (const link of baseLinks) {
      if (!targetLinksSet.has(linkKey(link))) {
        removedLinks.push(link);
      }
    }

    // 3. Policies Diffing
    const basePolicies = baseIR.policies || {};
    const targetPolicies = targetIR.policies || {};
    const policyDiffs: PolicyDiff[] = [];

    // Autonomy Level
    const baseAutonomy = basePolicies.defaultAutonomyLevel || "read-only";
    const targetAutonomy = targetPolicies.defaultAutonomyLevel || "read-only";
    if (baseAutonomy !== targetAutonomy) {
      const baseOrder = AUTONOMY_LEVEL_ORDER[baseAutonomy] || 0;
      const targetOrder = AUTONOMY_LEVEL_ORDER[targetAutonomy] || 0;
      const isBreaking = targetOrder > baseOrder;
      if (isBreaking) {
        breakingReasons.push(
          `Autonomy level escalated from '${baseAutonomy}' to '${targetAutonomy}'.`,
        );
      }
      policyDiffs.push({
        field: "defaultAutonomyLevel",
        oldValue: baseAutonomy,
        newValue: targetAutonomy,
        description: `Default autonomy level changed from '${baseAutonomy}' to '${targetAutonomy}'.`,
        isBreaking,
      });
    }

    // Dangerous Tools
    const baseDisableDangerous = basePolicies.disableDangerousTools ?? true;
    const targetDisableDangerous = targetPolicies.disableDangerousTools ?? true;
    if (baseDisableDangerous !== targetDisableDangerous) {
      const isBreaking = baseDisableDangerous && !targetDisableDangerous;
      if (isBreaking) {
        breakingReasons.push(
          "disableDangerousTools restriction was disabled (dangerous tools are now permitted).",
        );
      }
      policyDiffs.push({
        field: "disableDangerousTools",
        oldValue: baseDisableDangerous,
        newValue: targetDisableDangerous,
        description: `Dangerous tools protection was changed to ${targetDisableDangerous}.`,
        isBreaking,
      });
    }

    // Required Approvals
    const baseApprovals = new Set(basePolicies.requireApprovalFor || []);
    const targetApprovals = new Set(targetPolicies.requireApprovalFor || []);
    for (const tool of baseApprovals) {
      if (!targetApprovals.has(tool)) {
        breakingReasons.push(
          `Approval requirement removed for high-risk action '${tool}'.`,
        );
        policyDiffs.push({
          field: "requireApprovalFor",
          oldValue: tool,
          newValue: null,
          description: `Approval requirement removed for action '${tool}'.`,
          isBreaking: true,
        });
      }
    }
    for (const tool of targetApprovals) {
      if (!baseApprovals.has(tool)) {
        policyDiffs.push({
          field: "requireApprovalFor",
          oldValue: null,
          newValue: tool,
          description: `New approval requirement added for action '${tool}'.`,
          isBreaking: false,
        });
      }
    }

    // PII Handling
    if (basePolicies.piiHandling !== targetPolicies.piiHandling) {
      const isBreaking =
        basePolicies.piiHandling === "redact" &&
        targetPolicies.piiHandling !== "redact";
      if (isBreaking) {
        breakingReasons.push(
          `PII handling relaxed from '${basePolicies.piiHandling}' to '${targetPolicies.piiHandling || "default"}'.`,
        );
      }
      policyDiffs.push({
        field: "piiHandling",
        oldValue: basePolicies.piiHandling,
        newValue: targetPolicies.piiHandling,
        description: `PII handling changed from '${basePolicies.piiHandling}' to '${targetPolicies.piiHandling}'.`,
        isBreaking,
      });
    }

    // 4. Capabilities Diffing
    const baseCaps = new Map<string, Capability>(
      (baseIR.capabilities || []).map((c) => [c.id, c]),
    );
    const targetCaps = new Map<string, Capability>(
      (targetIR.capabilities || []).map((c) => [c.id, c]),
    );

    const capabilityDiffs: CapabilityDiff[] = [];

    // Check added and modified capabilities
    for (const [id, targetCap] of targetCaps.entries()) {
      const baseCap = baseCaps.get(id);
      if (!baseCap) {
        capabilityDiffs.push({
          capabilityId: id,
          name: targetCap.name,
          changeType: "added",
          isBreaking: false,
        });
      } else {
        const changes: FieldChange[] = [];
        let isBreaking = false;
        const reasons: string[] = [];

        // Risk level escalation
        const baseRisk = RISK_LEVEL_ORDER[baseCap.riskLevel] || 0;
        const targetRisk = RISK_LEVEL_ORDER[targetCap.riskLevel] || 0;
        if (baseCap.riskLevel !== targetCap.riskLevel) {
          changes.push({
            field: "riskLevel",
            oldValue: baseCap.riskLevel,
            newValue: targetCap.riskLevel,
          });
          if (targetRisk > baseRisk) {
            isBreaking = true;
            reasons.push(
              `Risk level escalated from '${baseCap.riskLevel}' to '${targetCap.riskLevel}'.`,
            );
          }
        }

        // Side effects escalation
        const baseSide = SIDE_EFFECT_ORDER[baseCap.sideEffects] || 0;
        const targetSide = SIDE_EFFECT_ORDER[targetCap.sideEffects] || 0;
        if (baseCap.sideEffects !== targetCap.sideEffects) {
          changes.push({
            field: "sideEffects",
            oldValue: baseCap.sideEffects,
            newValue: targetCap.sideEffects,
          });
          if (targetSide > baseSide) {
            isBreaking = true;
            reasons.push(
              `Side effect severity increased from '${baseCap.sideEffects}' to '${targetCap.sideEffects}'.`,
            );
          }
        }

        // Approval requirement removed
        if (baseCap.requiresApproval && !targetCap.requiresApproval) {
          changes.push({
            field: "requiresApproval",
            oldValue: true,
            newValue: false,
          });
          isBreaking = true;
          reasons.push("Mandatory human-in-the-loop approval was removed.");
        }

        // PII reading enabled
        if (!baseCap.readsPII && targetCap.readsPII) {
          changes.push({
            field: "readsPII",
            oldValue: false,
            newValue: true,
          });
          isBreaking = true;
          reasons.push("Capability now accesses PII data (readsPII).");
        }

        // PII writing enabled
        if (!baseCap.writesPII && targetCap.writesPII) {
          changes.push({
            field: "writesPII",
            oldValue: false,
            newValue: true,
          });
          isBreaking = true;
          reasons.push(
            "Capability now persists/modifies PII data (writesPII).",
          );
        }

        if (changes.length > 0) {
          if (isBreaking) {
            breakingReasons.push(
              `Capability '${id}' (${targetCap.name}): ${reasons.join(" ")}`,
            );
          }
          capabilityDiffs.push({
            capabilityId: id,
            name: targetCap.name,
            changeType: "modified",
            changes,
            isBreaking,
            breakingReason: reasons.length > 0 ? reasons.join(" ") : undefined,
          });
        }
      }
    }

    // Check removed capabilities
    for (const [id, baseCap] of baseCaps.entries()) {
      if (!targetCaps.has(id)) {
        breakingReasons.push(
          `Capability '${id}' (${baseCap.name}) was removed.`,
        );
        capabilityDiffs.push({
          capabilityId: id,
          name: baseCap.name,
          changeType: "removed",
          isBreaking: true,
          breakingReason: "Capability was removed from active bundle.",
        });
      }
    }

    const summary: DiffSummary = {
      addedConcepts: addedConcepts.length,
      removedConcepts: removedConcepts.length,
      modifiedConcepts: modifiedConcepts.length,
      addedLinks: addedLinks.length,
      removedLinks: removedLinks.length,
      brokenLinks: brokenLinks.length,
      policyChanges: policyDiffs.length,
      addedCapabilities: capabilityDiffs.filter((c) => c.changeType === "added")
        .length,
      removedCapabilities: capabilityDiffs.filter(
        (c) => c.changeType === "removed",
      ).length,
      modifiedCapabilities: capabilityDiffs.filter(
        (c) => c.changeType === "modified",
      ).length,
      isBreaking: breakingReasons.length > 0,
    };

    return {
      baseBundleId: baseIR.bundleId,
      targetBundleId: targetIR.bundleId,
      concepts: {
        added: addedConcepts,
        removed: removedConcepts,
        modified: modifiedConcepts,
      },
      links: {
        added: addedLinks,
        removed: removedLinks,
        broken: brokenLinks,
      },
      policies: policyDiffs,
      capabilities: capabilityDiffs,
      isBreaking: breakingReasons.length > 0,
      breakingReasons,
      summary,
    };
  }
}

/**
 * Convenience helper to compare two AgentKnowledgeIR envelopes.
 */
export function diffKnowledgeIR(
  baseIR: AgentKnowledgeIR,
  targetIR: AgentKnowledgeIR,
  options?: SemanticDiffOptions,
): SemanticDiffResult {
  const engine = new SemanticDiffEngine(options);
  return engine.diff(baseIR, targetIR);
}
