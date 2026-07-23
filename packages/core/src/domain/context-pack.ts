export type ContextPackRequest = {
  task: string;
  profile: string;
  maxTokens: number;
  mode: "minimal" | "balanced" | "full" | "audit";
  includeProvenance: boolean;
  riskLevel?: "low" | "medium" | "high";
};

export type ContextPackResult = {
  summary: string;
  documents: Array<{
    id: string;
    title: string;
    relevance: number;
    estimatedTokens: number;
    excerpt: string;
    provenance: string;
  }>;
  omitted: Array<{ id: string; reason: string }>;
  totalEstimatedTokens: number;
};
