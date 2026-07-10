export interface ContextPackManifest {
  profile: string;
  task: string;
  budgetTokens: number;
  totalEstimatedTokens: number;
  documentsIncluded: {
    id: string;
    title: string;
    relevance: number;
    estimatedTokens: number;
    reason: string;
  }[];
  documentsExcluded: {
    id: string;
    title: string;
    relevance: number;
    estimatedTokens: number;
    reason: string;
  }[];
  generatedAt: string;
}
