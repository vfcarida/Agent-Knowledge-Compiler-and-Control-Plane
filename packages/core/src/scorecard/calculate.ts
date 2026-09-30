import { ScorecardDimension } from "./types.js";
import type { ScorecardReport, DimensionScore } from "./types.js";
import { generateRecommendations } from "./recommendations.js";
import type { AgentKnowledgeIR } from "../ir/types.js";

export function calculateScorecard(
  ir: AgentKnowledgeIR,
  rawFiles: { path: string; content: string }[] = [],
): ScorecardReport {
  const dimensions: DimensionScore[] = [];

  // 1. Knowledge Structure (10 pts)
  // E.g. Check if concepts have semantic subdirectories
  let structureScore = 0;
  if (ir.concepts.length > 0) {
    const rootFiles = ir.concepts.filter(
      (c) =>
        !c.source.filePath.includes("/") && !c.source.filePath.includes("\\"),
    );
    const nonRootRatio = 1 - rootFiles.length / ir.concepts.length;
    structureScore = Math.round(nonRootRatio * 10);
  }
  dimensions.push({
    dimension: ScorecardDimension.KnowledgeStructure,
    score: structureScore,
    maxScore: 10,
    details: [
      `Found ${ir.concepts.length} concepts, with ${structureScore}0% in subdirectories.`,
    ],
  });

  // 2. OKF Compatibility (10 pts)
  let okfScore = 0;
  if (ir.concepts.length > 0) {
    const validOkf = ir.concepts.filter(
      (c) => c.frontmatter && c.frontmatter.type,
    );
    okfScore = Math.round((validOkf.length / ir.concepts.length) * 10);
  }
  dimensions.push({
    dimension: ScorecardDimension.OKFCompatibility,
    score: okfScore,
    maxScore: 10,
    details: [`${okfScore}0% of documents have valid type frontmatter.`],
  });

  // 3. Context Economy (10 pts)
  let economyScore = 0;
  if (ir.concepts.length > 0) {
    const totalTokens = ir.concepts.reduce(
      (sum, c) => sum + (c.budget?.estimatedTokens || 0),
      0,
    );
    const avgTokens = totalTokens / ir.concepts.length;
    // Penalty if average > 2000
    if (avgTokens < 500) economyScore = 10;
    else if (avgTokens < 1000) economyScore = 8;
    else if (avgTokens < 2000) economyScore = 5;
    else economyScore = 2;
  }
  dimensions.push({
    dimension: ScorecardDimension.ContextEconomy,
    score: economyScore,
    maxScore: 10,
    details: [`Average concept token size is within acceptable limits.`],
  });

  // 4. MCP Readiness (10 pts)
  let mcpScore = 0;
  const hasMcpTarget = ir.targets?.some(
    (t: any) =>
      t === "mcp-profile-server" ||
      t === "mcp-automation-server" ||
      t?.type?.includes("mcp"),
  );
  if (hasMcpTarget) mcpScore = 10;
  dimensions.push({
    dimension: ScorecardDimension.MCPReadiness,
    score: mcpScore,
    maxScore: 10,
    details: hasMcpTarget
      ? ["MCP target detected in compile configuration."]
      : ["No MCP targets detected."],
  });

  // 5. Policy Coverage (10 pts)
  let policyScore = 0;
  if (ir.policies && Object.keys(ir.policies).length > 0) {
    policyScore = 10;
  }
  dimensions.push({
    dimension: ScorecardDimension.PolicyCoverage,
    score: policyScore,
    maxScore: 10,
    details:
      policyScore === 10
        ? ["Policies object is populated."]
        : ["No policies detected."],
  });

  // 6. Security Posture (10 pts)
  let securityScore = 0;
  if (
    ir.policies?.defaultAutonomyLevel ||
    ir.policies?.piiHandling ||
    ir.policies?.disableDangerousTools !== undefined
  ) {
    securityScore = 10;
  }
  dimensions.push({
    dimension: ScorecardDimension.SecurityPosture,
    score: securityScore,
    maxScore: 10,
    details:
      securityScore === 10
        ? ["Security policy constraints found."]
        : ["Missing explicit security constraints."],
  });

  // 7. Provenance (10 pts)
  let provenanceScore = 0;
  if (
    ir.concepts.length > 0 &&
    ir.concepts.some((c) => c.provenance?.sourceHash)
  ) {
    provenanceScore = 10;
  }
  dimensions.push({
    dimension: ScorecardDimension.Provenance,
    score: provenanceScore,
    maxScore: 10,
    details:
      provenanceScore === 10
        ? ["Provenance hashes generated."]
        : ["Provenance generation is disabled."],
  });

  // 8. Evals (10 pts)
  let evalsScore = 0;
  const hasEvalTargets = ir.targets?.some(
    (t: any) => t === "eval-dataset" || t?.type === "eval-dataset",
  );
  const hasTestFiles = rawFiles.some(
    (f) =>
      f.path.includes(".test.ts") ||
      f.path.includes("__tests__") ||
      f.path.includes("evals/"),
  );
  if (hasEvalTargets || hasTestFiles) {
    evalsScore = 10;
  }
  dimensions.push({
    dimension: ScorecardDimension.Evals,
    score: evalsScore,
    maxScore: 10,
    details:
      evalsScore === 10
        ? ["Evaluation configurations/files found."]
        : ["No evaluation integration detected."],
  });

  // 9. Freshness (10 pts)
  let freshnessScore = 0;
  if (ir.concepts.length > 0) {
    const staleCount = ir.concepts.filter((c) => c.isStale).length;
    const staleRatio = staleCount / ir.concepts.length;
    if (staleRatio === 0) freshnessScore = 10;
    else if (staleRatio < 0.1) freshnessScore = 8;
    else if (staleRatio < 0.3) freshnessScore = 5;
    else freshnessScore = 2;
  }
  dimensions.push({
    dimension: ScorecardDimension.Freshness,
    score: freshnessScore,
    maxScore: 10,
    details: [
      `Bundle has ${ir.concepts.filter((c) => c.isStale).length} stale concepts.`,
    ],
  });

  // 10. DX (10 pts)
  let dxScore = 0;
  const hasIndex = rawFiles.some(
    (f) => f.path === "index.md" || f.path === "index.yaml",
  );
  const hasLog = rawFiles.some((f) => f.path === "log.md");
  if (hasIndex) dxScore += 5;
  if (hasLog) dxScore += 5;
  dimensions.push({
    dimension: ScorecardDimension.DX,
    score: dxScore,
    maxScore: 10,
    details: [`Index present: ${hasIndex}, Log present: ${hasLog}.`],
  });

  const totalScore = dimensions.reduce((sum, dim) => sum + dim.score, 0);

  return {
    totalScore,
    maxTotalScore: 100,
    dimensions,
    recommendations: generateRecommendations(dimensions),
    timestamp: new Date().toISOString(),
    bundleId: ir.bundleId,
  };
}
