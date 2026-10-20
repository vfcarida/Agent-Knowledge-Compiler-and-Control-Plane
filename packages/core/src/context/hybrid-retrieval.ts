import type { OKFDocument } from "../domain/types.js";
import { buildSemanticGraph } from "../graph/build-graph.js";
import type { KnowledgeGraph } from "../graph/types.js";

export interface HybridRankedDocument {
  document: OKFDocument;
  conceptId: string;
  bm25Score: number;
  vectorScore: number;
  graphScore: number;
  rrfScore: number;
  rank: number;
}

export interface HybridRetrievalOptions {
  /** BM25 saturation parameter k1 (default: 1.5) */
  k1?: number;
  /** BM25 length normalization parameter b (default: 0.75) */
  b?: number;
  /** Dimensionality of deterministic feature-hashed dense embeddings (default: 64) */
  embeddingDims?: number;
  /** Personalized PageRank damping factor (default: 0.85) */
  pprDamping?: number;
  /** Personalized PageRank power iterations (default: 20) */
  pprIterations?: number;
  /** Reciprocal Rank Fusion constant k (default: 60) */
  rrfK?: number;
  /** Optional precomputed embeddings keyed by conceptId */
  precomputedEmbeddings?: Record<string, number[]>;
  /** Optional prebuilt semantic graph */
  semanticGraph?: KnowledgeGraph;
}

/**
 * Tokenizes text into normalized alphanumeric terms with length >= 2.
 */
export function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

/**
 * Computes a deterministic, L2-normalized dense vector representation of text
 * using signed FNV-1a feature hashing over unigrams and bigrams.
 * Operates 100% offline with zero external API keys while preserving semantic overlap.
 */
export function embedTextDeterministic(text: string, dims = 64): number[] {
  const vec = new Array<number>(dims).fill(0);
  const tokens = tokenizeText(text);
  if (tokens.length === 0) {
    return vec;
  }

  const features: string[] = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) {
    features.push(`${tokens[i]}_${tokens[i + 1]}`);
  }

  for (const feat of features) {
    let h1 = 2166136261;
    let h2 = 16777619;
    for (let i = 0; i < feat.length; i++) {
      const c = feat.charCodeAt(i);
      h1 ^= c;
      h1 = Math.imul(h1, 16777619) >>> 0;
      h2 ^= c * 31;
      h2 = Math.imul(h2, 2166136261) >>> 0;
    }
    const idx = h1 % dims;
    const sign = (h2 & 1) === 0 ? 1 : -1;
    vec[idx] = (vec[idx] ?? 0) + sign;
  }

  let normSq = 0;
  for (const v of vec) {
    normSq += v * v;
  }
  const norm = Math.sqrt(normSq);
  if (norm > 0) {
    for (let i = 0; i < dims; i++) {
      vec[i] = Number(((vec[i] ?? 0) / norm).toFixed(6));
    }
  }
  return vec;
}

/**
 * Computes cosine similarity between two dense vectors in [0, 1].
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const len = Math.min(vecA.length, vecB.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    const a = vecA[i] ?? 0;
    const b = vecB[i] ?? 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  if (normA === 0 || normB === 0) return 0;
  const raw = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, raw));
}

function getDocumentFullText(doc: OKFDocument): string {
  const title = doc.frontmatter.title || "";
  const type = doc.frontmatter.type || "";
  const desc = doc.frontmatter.description || "";
  const tags = Array.isArray(doc.frontmatter.tags)
    ? doc.frontmatter.tags.join(" ")
    : "";
  // Weight title and tags higher by repeating them
  return `${title} ${title} ${type} ${tags} ${tags} ${desc} ${doc.body}`;
}

/**
 * Computes Okapi BM25 lexical relevance scores across a document collection.
 */
export function computeBm25Scores(
  documents: OKFDocument[],
  query: string,
  k1 = 1.5,
  b = 0.75,
): Map<string, number> {
  const scores = new Map<string, number>();
  if (documents.length === 0) return scores;

  const queryTerms = Array.from(new Set(tokenizeText(query)));
  if (queryTerms.length === 0) {
    for (const doc of documents) {
      scores.set(doc.conceptId, 0.5);
    }
    return scores;
  }

  const docTokensList = documents.map((doc) => ({
    conceptId: doc.conceptId,
    tokens: tokenizeText(getDocumentFullText(doc)),
  }));

  const avgDl =
    docTokensList.reduce((acc, d) => acc + d.tokens.length, 0) /
    Math.max(1, documents.length);

  // Document frequency per query term
  const df = new Map<string, number>();
  for (const term of queryTerms) {
    let count = 0;
    for (const d of docTokensList) {
      if (d.tokens.includes(term)) count++;
    }
    df.set(term, count);
  }

  const N = documents.length;
  let maxScore = 0;

  for (const d of docTokensList) {
    const dl = d.tokens.length;
    const tfMap = new Map<string, number>();
    for (const t of d.tokens) {
      tfMap.set(t, (tfMap.get(t) ?? 0) + 1);
    }

    let score = 0;
    for (const term of queryTerms) {
      const tf = tfMap.get(term) ?? 0;
      if (tf === 0) continue;
      const n_q = df.get(term) ?? 0;
      const idf = Math.log(1 + (N - n_q + 0.5) / (n_q + 0.5));
      const denom = tf + k1 * (1 - b + b * (dl / Math.max(1, avgDl)));
      score += idf * ((tf * (k1 + 1)) / denom);
    }

    scores.set(d.conceptId, score);
    if (score > maxScore) maxScore = score;
  }

  // Normalize to [0, 1]
  if (maxScore > 0) {
    for (const [id, s] of scores.entries()) {
      scores.set(id, s / maxScore);
    }
  }

  return scores;
}

/**
 * Computes Personalized PageRank (PPR) over the Semantic Knowledge Graph,
 * propagating relevance from query-matched seed concepts to connected concepts.
 */
export function computePersonalizedPageRank(
  graph: KnowledgeGraph,
  seedWeights: Map<string, number>,
  damping = 0.85,
  iterations = 20,
): Map<string, number> {
  const nodeIds = graph.nodes.map((n) => n.conceptId);
  const N = nodeIds.length;
  const ppr = new Map<string, number>();
  if (N === 0) return ppr;

  // Normalize seed personalization vector
  let seedSum = 0;
  for (const id of nodeIds) {
    seedSum += Math.max(0, seedWeights.get(id) ?? 0);
  }

  const personalization = new Map<string, number>();
  for (const id of nodeIds) {
    const w =
      seedSum > 0 ? Math.max(0, seedWeights.get(id) ?? 0) / seedSum : 1 / N;
    personalization.set(id, w);
    ppr.set(id, w);
  }

  // Build adjacency list (both directions with higher weight on outgoing dependencies)
  const outgoing = new Map<string, string[]>();
  const nodeSet = new Set(nodeIds);
  for (const id of nodeIds) {
    outgoing.set(id, []);
  }
  for (const edge of graph.edges) {
    if (
      nodeSet.has(edge.sourceConceptId) &&
      nodeSet.has(edge.targetConceptId)
    ) {
      outgoing.get(edge.sourceConceptId)?.push(edge.targetConceptId);
    }
  }

  for (let iter = 0; iter < iterations; iter++) {
    const nextPpr = new Map<string, number>();
    let danglingMass = 0;

    for (const id of nodeIds) {
      const neighbors = outgoing.get(id) ?? [];
      if (neighbors.length === 0) {
        danglingMass += ppr.get(id) ?? 0;
      }
    }

    for (const id of nodeIds) {
      const base =
        (1 - damping) * (personalization.get(id) ?? 1 / N) +
        damping * danglingMass * (personalization.get(id) ?? 1 / N);
      nextPpr.set(id, base);
    }

    for (const id of nodeIds) {
      const neighbors = outgoing.get(id) ?? [];
      if (neighbors.length > 0) {
        const share = (damping * (ppr.get(id) ?? 0)) / neighbors.length;
        for (const targetId of neighbors) {
          nextPpr.set(targetId, (nextPpr.get(targetId) ?? 0) + share);
        }
      }
    }

    for (const [id, val] of nextPpr.entries()) {
      ppr.set(id, val);
    }
  }

  // Normalize max to 1.0
  let maxVal = 0;
  for (const v of ppr.values()) {
    if (v > maxVal) maxVal = v;
  }
  if (maxVal > 0) {
    for (const [id, v] of ppr.entries()) {
      ppr.set(id, v / maxVal);
    }
  }

  return ppr;
}

/**
 * Combines multiple ranked concept ID lists using Reciprocal Rank Fusion (RRF).
 */
export function reciprocalRankFusion(
  rankedLists: string[][],
  k = 60,
): Map<string, number> {
  const fused = new Map<string, number>();
  for (const list of rankedLists) {
    for (let rankIdx = 0; rankIdx < list.length; rankIdx++) {
      const id = list[rankIdx];
      if (!id) continue;
      const rrfContribution = 1 / (k + rankIdx + 1);
      fused.set(id, (fused.get(id) ?? 0) + rrfContribution);
    }
  }

  // Normalize against theoretical maximum (rank 1 in all lists)
  const maxPossible = rankedLists.length * (1 / (k + 1));
  if (maxPossible > 0) {
    for (const [id, score] of fused.entries()) {
      fused.set(id, Number(Math.min(1, score / maxPossible).toFixed(6)));
    }
  }
  return fused;
}

/**
 * Hybrid retrieval engine combining BM25 lexical scoring, dense vector cosine similarity,
 * and Personalized PageRank over the Semantic Knowledge Graph via Reciprocal Rank Fusion (RRF).
 */
export class HybridRetriever {
  public static rank(
    documents: OKFDocument[],
    query: string,
    options: HybridRetrievalOptions = {},
  ): HybridRankedDocument[] {
    if (documents.length === 0) return [];

    const dims = options.embeddingDims ?? 64;
    const bm25Map = computeBm25Scores(
      documents,
      query,
      options.k1 ?? 1.5,
      options.b ?? 0.75,
    );

    const queryVec = embedTextDeterministic(query, dims);
    const vectorMap = new Map<string, number>();
    for (const doc of documents) {
      const docVec =
        options.precomputedEmbeddings?.[doc.conceptId] ??
        embedTextDeterministic(getDocumentFullText(doc), dims);
      vectorMap.set(doc.conceptId, cosineSimilarity(queryVec, docVec));
    }

    const graph = options.semanticGraph ?? buildSemanticGraph(documents);
    const seedWeights = new Map<string, number>();
    for (const doc of documents) {
      const lexical = bm25Map.get(doc.conceptId) ?? 0;
      const dense = vectorMap.get(doc.conceptId) ?? 0;
      // Combine lexical, dense, and explicit priority for PPR seed personalization
      const priorityBoost =
        doc.frontmatter.priority === "critical"
          ? 0.2
          : doc.frontmatter.priority === "high"
            ? 0.1
            : 0;
      seedWeights.set(
        doc.conceptId,
        lexical * 0.5 + dense * 0.5 + priorityBoost,
      );
    }

    const graphMap = computePersonalizedPageRank(
      graph,
      seedWeights,
      options.pprDamping ?? 0.85,
      options.pprIterations ?? 20,
    );

    const bm25Order = [...documents]
      .sort(
        (a, b) =>
          (bm25Map.get(b.conceptId) ?? 0) - (bm25Map.get(a.conceptId) ?? 0) ||
          a.conceptId.localeCompare(b.conceptId),
      )
      .map((d) => d.conceptId);

    const vectorOrder = [...documents]
      .sort(
        (a, b) =>
          (vectorMap.get(b.conceptId) ?? 0) -
            (vectorMap.get(a.conceptId) ?? 0) ||
          a.conceptId.localeCompare(b.conceptId),
      )
      .map((d) => d.conceptId);

    const graphOrder = [...documents]
      .sort(
        (a, b) =>
          (graphMap.get(b.conceptId) ?? 0) - (graphMap.get(a.conceptId) ?? 0) ||
          a.conceptId.localeCompare(b.conceptId),
      )
      .map((d) => d.conceptId);

    const rrfMap = reciprocalRankFusion(
      [bm25Order, vectorOrder, graphOrder],
      options.rrfK ?? 60,
    );

    const results: HybridRankedDocument[] = documents.map((doc) => ({
      document: doc,
      conceptId: doc.conceptId,
      bm25Score: Number((bm25Map.get(doc.conceptId) ?? 0).toFixed(4)),
      vectorScore: Number((vectorMap.get(doc.conceptId) ?? 0).toFixed(4)),
      graphScore: Number((graphMap.get(doc.conceptId) ?? 0).toFixed(4)),
      rrfScore: Number((rrfMap.get(doc.conceptId) ?? 0).toFixed(4)),
      rank: 0,
    }));

    results.sort(
      (a, b) =>
        b.rrfScore - a.rrfScore ||
        b.bm25Score - a.bm25Score ||
        a.conceptId.localeCompare(b.conceptId),
    );

    results.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    return results;
  }
}
