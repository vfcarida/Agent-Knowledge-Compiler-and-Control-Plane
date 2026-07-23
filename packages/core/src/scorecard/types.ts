export enum ScorecardDimension {
  // eslint-disable-next-line no-unused-vars
  KnowledgeStructure = "knowledge-structure",
  // eslint-disable-next-line no-unused-vars
  OKFCompatibility = "okf-compatibility",
  // eslint-disable-next-line no-unused-vars
  ContextEconomy = "context-economy",
  // eslint-disable-next-line no-unused-vars
  MCPReadiness = "mcp-readiness",
  // eslint-disable-next-line no-unused-vars
  PolicyCoverage = "policy-coverage",
  // eslint-disable-next-line no-unused-vars
  SecurityPosture = "security-posture",
  // eslint-disable-next-line no-unused-vars
  Provenance = "provenance",
  // eslint-disable-next-line no-unused-vars
  Evals = "evals",
  // eslint-disable-next-line no-unused-vars
  Freshness = "freshness",
  // eslint-disable-next-line no-unused-vars
  DX = "dx",
}

export interface DimensionScore {
  dimension: ScorecardDimension;
  score: number;
  maxScore: number;
  details: string[];
}

export interface Recommendation {
  dimension: ScorecardDimension;
  action: string;
  impact: "high" | "medium" | "low";
}

export interface ScorecardReport {
  totalScore: number;
  maxTotalScore: number;
  dimensions: DimensionScore[];
  recommendations: Recommendation[];
  timestamp: string;
  bundleId: string;
}
