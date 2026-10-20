import path from "node:path";
import type { OKFDocument } from "../domain/types.js";
import { buildSemanticGraph } from "../graph/build-graph.js";
import { computeImpactMap } from "../graph/impact-analysis.js";

export interface WatchImpactPlan {
  changedFilePath: string;
  matchedConceptId?: string;
  impactedConceptIds: string[];
  requiresFullRebuild: boolean;
  affectedTargetTypes: string[];
}

/**
 * Computes the incremental blast radius when a file changes in a watched OKF bundle.
 * Maps the modified file to its concept node in the Semantic Knowledge Graph and
 * returns all transitive downstream concepts and affected compiler target types.
 */
export function computeWatchImpactPlan(
  changedFilePath: string,
  documents: OKFDocument[],
  configuredTargetTypes: string[] = [
    "context-pack",
    "agent-instructions",
    "mcp-resources",
    "graph-json",
    "hybrid-index",
  ],
): WatchImpactPlan {
  const normalizedChange = path.resolve(changedFilePath).replace(/\\/g, "/");
  const baseName = path.basename(normalizedChange);

  // Config or policy file changes require a full rebuild across all targets
  if (
    baseName === "akcp.yaml" ||
    baseName === "capabilities.json" ||
    baseName.endsWith(".policy.yaml") ||
    baseName.endsWith(".policy.json")
  ) {
    return {
      changedFilePath,
      impactedConceptIds: documents.map((d) => d.conceptId),
      requiresFullRebuild: true,
      affectedTargetTypes: [...configuredTargetTypes],
    };
  }

  const matchedDoc = documents.find((doc) => {
    const resolvedDocPath = path.resolve(doc.filePath).replace(/\\/g, "/");
    return (
      resolvedDocPath === normalizedChange ||
      resolvedDocPath.endsWith(`/${baseName}`) ||
      doc.conceptId === baseName.replace(/\.md$/i, "")
    );
  });

  if (!matchedDoc) {
    return {
      changedFilePath,
      impactedConceptIds: [],
      requiresFullRebuild: true,
      affectedTargetTypes: [...configuredTargetTypes],
    };
  }

  const graph = buildSemanticGraph(documents);
  const impactMap = computeImpactMap(graph);
  const downstream = impactMap[matchedDoc.conceptId] ?? [];
  const impactedConceptIds = Array.from(
    new Set([matchedDoc.conceptId, ...downstream]),
  );

  // Filter out pure policy/tool targets if only a markdown concept changed
  const nonConceptTargets = new Set(["policy-bundle", "mcp-tools"]);
  const affectedTargetTypes = configuredTargetTypes.filter(
    (t) => !nonConceptTargets.has(t),
  );

  return {
    changedFilePath,
    matchedConceptId: matchedDoc.conceptId,
    impactedConceptIds,
    requiresFullRebuild: false,
    affectedTargetTypes:
      affectedTargetTypes.length > 0
        ? affectedTargetTypes
        : [...configuredTargetTypes],
  };
}
