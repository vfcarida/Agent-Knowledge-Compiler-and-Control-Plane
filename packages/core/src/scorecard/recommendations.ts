import { ScorecardDimension } from "./types.js";
import type { Recommendation, DimensionScore } from "./types.js";

export function generateRecommendations(
  dimensions: DimensionScore[],
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const dim of dimensions) {
    if (dim.score === dim.maxScore) continue;

    switch (dim.dimension) {
      case ScorecardDimension.KnowledgeStructure:
        recommendations.push({
          dimension: dim.dimension,
          action:
            "Organize root-level concepts into semantic subdirectories (e.g., /skills, /experiences).",
          impact: "medium",
        });
        break;
      case ScorecardDimension.OKFCompatibility:
        recommendations.push({
          dimension: dim.dimension,
          action:
            'Ensure all markdown files have valid YAML frontmatter with a "type" field.',
          impact: "high",
        });
        break;
      case ScorecardDimension.ContextEconomy:
        recommendations.push({
          dimension: dim.dimension,
          action:
            "Split large documents into smaller concepts to reduce token footprint per document.",
          impact: "high",
        });
        break;
      case ScorecardDimension.MCPReadiness:
        recommendations.push({
          dimension: dim.dimension,
          action:
            'Add MCP server targets (e.g., "mcp-profile-server") in akcp.yaml compile.targets.',
          impact: "high",
        });
        break;
      case ScorecardDimension.PolicyCoverage:
        recommendations.push({
          dimension: dim.dimension,
          action:
            "Define organizational policies in akcp.yaml controlPlane.policies.",
          impact: "high",
        });
        break;
      case ScorecardDimension.SecurityPosture:
        recommendations.push({
          dimension: dim.dimension,
          action:
            "Strengthen security by declaring defaultAutonomyLevel and piiHandling in policies.",
          impact: "high",
        });
        break;
      case ScorecardDimension.Provenance:
        recommendations.push({
          dimension: dim.dimension,
          action:
            "Enable provenance hashing during IR build to track content source integrity.",
          impact: "medium",
        });
        break;
      case ScorecardDimension.Evals:
        recommendations.push({
          dimension: dim.dimension,
          action:
            "Include evaluation scenarios or tests to ensure agent reliability.",
          impact: "high",
        });
        break;
      case ScorecardDimension.Freshness:
        recommendations.push({
          dimension: dim.dimension,
          action:
            "Update or deprecate stale documents. Add lastReviewedAt and reviewCadenceDays.",
          impact: "medium",
        });
        break;
      case ScorecardDimension.DX:
        recommendations.push({
          dimension: dim.dimension,
          action:
            "Add index.md for entry-point documentation and log.md for changelogs.",
          impact: "low",
        });
        break;
    }
  }

  return recommendations.sort((a, b) => {
    const weights = { high: 3, medium: 2, low: 1 };
    return weights[b.impact] - weights[a.impact];
  });
}
