export enum ScorecardDimension {
  KnowledgeStructure = 'knowledge-structure',
  OKFCompatibility = 'okf-compatibility',
  ContextEconomy = 'context-economy',
  MCPReadiness = 'mcp-readiness',
  PolicyCoverage = 'policy-coverage',
  SecurityPosture = 'security-posture',
  Provenance = 'provenance',
  Evals = 'evals',
  Freshness = 'freshness',
  DX = 'dx'
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
  impact: 'high' | 'medium' | 'low';
}

export interface ScorecardReport {
  totalScore: number;
  maxTotalScore: number;
  dimensions: DimensionScore[];
  recommendations: Recommendation[];
  timestamp: string;
  bundleId: string;
}
