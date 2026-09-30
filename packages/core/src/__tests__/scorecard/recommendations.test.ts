import { describe, it, expect } from "vitest";
import { generateRecommendations } from "../../scorecard/recommendations.js";
import { ScorecardDimension } from "../../scorecard/types.js";
import type { DimensionScore } from "../../scorecard/types.js";

/** Creates a DimensionScore where score < maxScore to trigger a recommendation. */
function needsImprovement(
  dimension: ScorecardDimension,
  score = 0,
  maxScore = 10,
): DimensionScore {
  return { dimension, score, maxScore, details: [] };
}

/** Creates a DimensionScore where score === maxScore (no recommendation expected). */
function perfect(dimension: ScorecardDimension, maxScore = 10): DimensionScore {
  return { dimension, score: maxScore, maxScore, details: [] };
}

describe("generateRecommendations", () => {
  // --- Empty input -----------------------------------------------------------

  it("returns empty array when given an empty dimensions list", () => {
    expect(generateRecommendations([])).toEqual([]);
  });

  it("returns empty array when all dimensions are at perfect score", () => {
    const allPerfect = Object.values(ScorecardDimension).map((d) => perfect(d));
    expect(generateRecommendations(allPerfect)).toEqual([]);
  });

  // --- Individual dimension triggers ----------------------------------------

  it("generates a recommendation for KnowledgeStructure when below max score", () => {
    const result = generateRecommendations([
      needsImprovement(ScorecardDimension.KnowledgeStructure),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.dimension).toBe(ScorecardDimension.KnowledgeStructure);
    expect(result[0]!.action).toContain("subdirectories");
    expect(result[0]!.impact).toBe("medium");
  });

  it("generates a recommendation for OKFCompatibility when below max score", () => {
    const result = generateRecommendations([
      needsImprovement(ScorecardDimension.OKFCompatibility),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.dimension).toBe(ScorecardDimension.OKFCompatibility);
    expect(result[0]!.action).toContain("frontmatter");
    expect(result[0]!.impact).toBe("high");
  });

  it("generates a recommendation for ContextEconomy when below max score", () => {
    const result = generateRecommendations([
      needsImprovement(ScorecardDimension.ContextEconomy),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.dimension).toBe(ScorecardDimension.ContextEconomy);
    expect(result[0]!.action).toContain("token");
    expect(result[0]!.impact).toBe("high");
  });

  it("generates a recommendation for MCPReadiness when below max score", () => {
    const result = generateRecommendations([
      needsImprovement(ScorecardDimension.MCPReadiness),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.dimension).toBe(ScorecardDimension.MCPReadiness);
    expect(result[0]!.action).toContain("mcp-profile-server");
    expect(result[0]!.impact).toBe("high");
  });

  it("generates a recommendation for PolicyCoverage when below max score", () => {
    const result = generateRecommendations([
      needsImprovement(ScorecardDimension.PolicyCoverage),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.dimension).toBe(ScorecardDimension.PolicyCoverage);
    expect(result[0]!.action).toContain("policies");
    expect(result[0]!.impact).toBe("high");
  });

  it("generates a recommendation for SecurityPosture when below max score", () => {
    const result = generateRecommendations([
      needsImprovement(ScorecardDimension.SecurityPosture),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.dimension).toBe(ScorecardDimension.SecurityPosture);
    expect(result[0]!.action).toContain("defaultAutonomyLevel");
    expect(result[0]!.impact).toBe("high");
  });

  it("generates a recommendation for Provenance when below max score", () => {
    const result = generateRecommendations([
      needsImprovement(ScorecardDimension.Provenance),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.dimension).toBe(ScorecardDimension.Provenance);
    expect(result[0]!.action).toContain("provenance");
    expect(result[0]!.impact).toBe("medium");
  });

  it("generates a recommendation for Evals when below max score", () => {
    const result = generateRecommendations([
      needsImprovement(ScorecardDimension.Evals),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.dimension).toBe(ScorecardDimension.Evals);
    expect(result[0]!.action).toContain("evaluation");
    expect(result[0]!.impact).toBe("high");
  });

  it("generates a recommendation for Freshness when below max score", () => {
    const result = generateRecommendations([
      needsImprovement(ScorecardDimension.Freshness),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.dimension).toBe(ScorecardDimension.Freshness);
    expect(result[0]!.action).toContain("stale");
    expect(result[0]!.impact).toBe("medium");
  });

  it("generates a recommendation for DX when below max score", () => {
    const result = generateRecommendations([
      needsImprovement(ScorecardDimension.DX),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.dimension).toBe(ScorecardDimension.DX);
    expect(result[0]!.action).toContain("index.md");
    expect(result[0]!.impact).toBe("low");
  });

  // --- Sorting by impact ----------------------------------------------------

  it("sorts recommendations by descending impact (high > medium > low)", () => {
    const result = generateRecommendations([
      needsImprovement(ScorecardDimension.DX), // low
      needsImprovement(ScorecardDimension.KnowledgeStructure), // medium
      needsImprovement(ScorecardDimension.OKFCompatibility), // high
    ]);

    expect(result).toHaveLength(3);
    expect(result[0]!.impact).toBe("high");
    expect(result[1]!.impact).toBe("medium");
    expect(result[2]!.impact).toBe("low");
  });

  // --- Mixed perfect / imperfect --------------------------------------------

  it("skips dimensions that are at perfect score", () => {
    const result = generateRecommendations([
      perfect(ScorecardDimension.OKFCompatibility), // perfect - no rec
      needsImprovement(ScorecardDimension.PolicyCoverage), // needs improvement
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]!.dimension).toBe(ScorecardDimension.PolicyCoverage);
  });

  it("generates recommendations for all imperfect dimensions simultaneously", () => {
    const allDimensions = Object.values(ScorecardDimension).map((d) =>
      needsImprovement(d),
    );
    const result = generateRecommendations(allDimensions);

    // One recommendation per dimension
    expect(result).toHaveLength(Object.values(ScorecardDimension).length);

    // All high-impact ones come first
    const highImpact = result.filter((r) => r.impact === "high");
    const mediumImpact = result.filter((r) => r.impact === "medium");
    const lowImpact = result.filter((r) => r.impact === "low");

    // Verify no high-impact items appear after medium or low-impact items
    const firstMediumIdx = result.findIndex((r) => r.impact === "medium");
    const firstLowIdx = result.findIndex((r) => r.impact === "low");

    expect(highImpact.length).toBeGreaterThan(0);
    expect(mediumImpact.length).toBeGreaterThan(0);
    expect(lowImpact.length).toBeGreaterThan(0);

    if (firstMediumIdx >= 0) {
      // All items before the first medium should be high
      for (let i = 0; i < firstMediumIdx; i++) {
        expect(result[i]!.impact).toBe("high");
      }
    }

    if (firstLowIdx >= 0) {
      // All items before the first low should not be low
      for (let i = 0; i < firstLowIdx; i++) {
        expect(result[i]!.impact).not.toBe("low");
      }
    }
  });
});
