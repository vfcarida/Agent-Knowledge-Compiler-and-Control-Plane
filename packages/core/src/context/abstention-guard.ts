import type { OKFDocument } from "../domain/types.js";
import {
  HybridRetriever,
  tokenizeText,
  type HybridRankedDocument,
} from "./hybrid-retrieval.js";
import {
  detectKnowledgeContradictions,
  type ContradictionConceptInput,
  type KnowledgeContradiction,
} from "../graph/contradiction-detector.js";

export type EpistemicAbstentionAction =
  | "PROCEED"
  | "ABSTAIN_INSUFFICIENT_EVIDENCE"
  | "ABSTAIN_EPISTEMIC_CONTRADICTION";

export interface EpistemicAbstentionOptions {
  /** Minimum calibrated grounding confidence in [0, 1] required to proceed (default: 0.25) */
  minConfidence?: number;
  /** Number of top-ranked documents to inspect for grounding and contradiction checks (default: 5) */
  topK?: number;
  /** Whether to abstain if a critical POLARITY_CONFLICT exists among top-k retrieved documents (default: true) */
  abstainOnPolarityConflict?: boolean;
}

export interface EpistemicAbstentionDecision {
  action: EpistemicAbstentionAction;
  abstained: boolean;
  confidenceScore: number;
  lexicalCoverageRatio: number;
  topVectorSimilarity: number;
  topConceptIds: string[];
  activeContradictions: KnowledgeContradiction[];
  rationale: string;
}

const QUERY_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "what",
  "how",
  "when",
  "where",
  "who",
  "why",
  "can",
  "does",
  "is",
  "are",
  "to",
  "in",
  "on",
  "of",
  "from",
]);

/**
 * Evaluates calibrated epistemic grounding confidence and contradiction safety
 * for a given query against a corpus of OKFDocuments or HybridRankedDocuments.
 * Enforces Honest-by-Construction abstention when retrieval support is below threshold
 * or when top-ranked concepts contain opposing normative polarity rules (MUST vs NEVER).
 */
export function evaluateEpistemicAbstention(
  query: string,
  corpusOrRanked: OKFDocument[] | HybridRankedDocument[],
  options: EpistemicAbstentionOptions = {},
): EpistemicAbstentionDecision {
  const minConfidence = options.minConfidence ?? 0.25;
  const topK = options.topK ?? 5;
  const abstainOnPolarityConflict = options.abstainOnPolarityConflict ?? true;

  const queryTerms = tokenizeText(query).filter(
    (t) => !QUERY_STOP_WORDS.has(t),
  );

  if (queryTerms.length === 0 || corpusOrRanked.length === 0) {
    return {
      action: "ABSTAIN_INSUFFICIENT_EVIDENCE",
      abstained: true,
      confidenceScore: 0,
      lexicalCoverageRatio: 0,
      topVectorSimilarity: 0,
      topConceptIds: [],
      activeContradictions: [],
      rationale:
        "Abstaining: Empty query terms or empty knowledge corpus provides zero grounded evidence.",
    };
  }

  let ranked: HybridRankedDocument[];
  const firstItem = corpusOrRanked[0];
  if (firstItem && "rrfScore" in firstItem && "document" in firstItem) {
    ranked = (corpusOrRanked as HybridRankedDocument[]).slice(0, topK);
  } else {
    ranked = HybridRetriever.rank(corpusOrRanked as OKFDocument[], query).slice(
      0,
      topK,
    );
  }

  // Filter to documents that have non-zero lexical or vector relevance
  const relevantTop = ranked.filter(
    (r) => r.bm25Score > 0 || r.vectorScore > 0.05,
  );

  if (relevantTop.length === 0) {
    return {
      action: "ABSTAIN_INSUFFICIENT_EVIDENCE",
      abstained: true,
      confidenceScore: 0,
      lexicalCoverageRatio: 0,
      topVectorSimilarity: 0,
      topConceptIds: [],
      activeContradictions: [],
      rationale: `Abstaining: Zero retrieved documents matched query terms [${queryTerms.join(", ")}] above baseline noise threshold.`,
    };
  }

  // 1. Compute Lexical Term Coverage across top-k relevant documents
  const combinedTopText = relevantTop
    .map(
      (r) =>
        `${r.document.frontmatter.title ?? ""} ${(r.document.frontmatter.tags ?? []).join(" ")} ${r.document.body ?? ""}`,
    )
    .join(" ")
    .toLowerCase();
  const topTokenSet = new Set(tokenizeText(combinedTopText));

  let coveredCount = 0;
  for (const qt of queryTerms) {
    if (topTokenSet.has(qt)) {
      coveredCount++;
    }
  }

  const lexicalCoverageRatio = Number(
    (coveredCount / queryTerms.length).toFixed(4),
  );
  const topVectorSimilarity = Number(
    Math.max(0, ...relevantTop.map((r) => r.vectorScore)).toFixed(4),
  );

  // Calibrated convex combination of lexical coverage and dense feature cosine alignment
  const confidenceScore = Number(
    Math.min(
      1,
      0.65 * lexicalCoverageRatio + 0.35 * topVectorSimilarity,
    ).toFixed(4),
  );

  const topConceptIds = relevantTop.map((r) => r.conceptId);

  // 2. Check for Epistemic Contradictions among the top-k retrieved documents
  const conceptInputs: ContradictionConceptInput[] = relevantTop.map((r) => ({
    conceptId: r.conceptId,
    body: r.document.body,
    status: r.document.frontmatter.status ?? "active",
  }));

  const contradictionReport = detectKnowledgeContradictions(conceptInputs);
  const criticalPolarityConflicts = contradictionReport.contradictions.filter(
    (c) => c.kind === "POLARITY_CONFLICT",
  );

  if (abstainOnPolarityConflict && criticalPolarityConflicts.length > 0) {
    const firstConflict = criticalPolarityConflicts[0]!;
    return {
      action: "ABSTAIN_EPISTEMIC_CONTRADICTION",
      abstained: true,
      confidenceScore,
      lexicalCoverageRatio,
      topVectorSimilarity,
      topConceptIds,
      activeContradictions: criticalPolarityConflicts,
      rationale: `Abstaining due to unresolved epistemic polarity conflict between '${firstConflict.conceptA}' and '${firstConflict.conceptB}' on '${firstConflict.subjectKey}'.`,
    };
  }

  // 3. Check Calibrated Confidence against threshold
  if (confidenceScore < minConfidence) {
    return {
      action: "ABSTAIN_INSUFFICIENT_EVIDENCE",
      abstained: true,
      confidenceScore,
      lexicalCoverageRatio,
      topVectorSimilarity,
      topConceptIds,
      activeContradictions: contradictionReport.contradictions,
      rationale: `Abstaining: Grounding confidence ${confidenceScore} is below minimum threshold ${minConfidence} (lexical coverage: ${lexicalCoverageRatio}).`,
    };
  }

  return {
    action: "PROCEED",
    abstained: false,
    confidenceScore,
    lexicalCoverageRatio,
    topVectorSimilarity,
    topConceptIds,
    activeContradictions: contradictionReport.contradictions,
    rationale: `Grounded evidence verified (confidence: ${confidenceScore} >= ${minConfidence}, coverage: ${lexicalCoverageRatio}).`,
  };
}
