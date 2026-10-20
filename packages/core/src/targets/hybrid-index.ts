import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { AgentKnowledgeIR } from "../ir/types.js";
import type { CompileTarget, TargetConfig, TargetOutput } from "./types.js";
import {
  embedTextDeterministic,
  tokenizeText,
  computePersonalizedPageRank,
} from "../context/hybrid-retrieval.js";
import { buildSemanticGraph } from "../graph/build-graph.js";

/**
 * Compiler target that emits a deterministic hybrid retrieval index (`hybrid-index.json`)
 * containing precomputed L2-normalized dense embeddings, term frequencies, and
 * Personalized PageRank centrality scores for all active knowledge concepts.
 */
export class HybridIndexTarget implements CompileTarget {
  public readonly targetType = "hybrid-index";

  public async compile(
    ir: AgentKnowledgeIR,
    config: TargetConfig,
  ): Promise<TargetOutput> {
    const outPath = path.resolve(process.cwd(), config.out);
    await fs.mkdir(path.dirname(outPath), { recursive: true });

    const sortedConcepts = [...(ir.concepts || [])].sort((a, b) =>
      a.conceptId.localeCompare(b.conceptId),
    );

    const graph = buildSemanticGraph(ir);
    const uniformSeeds = new Map<string, number>();
    for (const c of sortedConcepts) {
      uniformSeeds.set(c.conceptId, 1);
    }
    const centralityMap = computePersonalizedPageRank(graph, uniformSeeds);

    const entries = sortedConcepts.map((c) => {
      const title = c.frontmatter.title || c.conceptId;
      const tags = Array.isArray(c.frontmatter.tags)
        ? c.frontmatter.tags.join(" ")
        : "";
      const fullText = `${title} ${title} ${c.type} ${tags} ${c.body}`;
      const tokens = tokenizeText(fullText);
      const embedding = embedTextDeterministic(fullText, 64);

      return {
        conceptId: c.conceptId,
        title,
        type: c.type,
        tokenCount: tokens.length,
        centralityScore: Number(
          (centralityMap.get(c.conceptId) ?? 0).toFixed(6),
        ),
        embedding,
      };
    });

    const payload = {
      schemaVersion: "1.0.0",
      bundleId: ir.bundleId,
      generatedAt: ir.timestamp || "1970-01-01T00:00:00.000Z",
      embeddingDimensions: 64,
      totalConcepts: entries.length,
      entries,
    };

    const content = JSON.stringify(payload, null, 2);
    await fs.writeFile(outPath, content, "utf-8");

    const hash = createHash("sha256").update(content).digest("hex");
    const bytesWritten = Buffer.byteLength(content, "utf8");

    return {
      targetType: this.targetType,
      outputPath: outPath,
      hash,
      bytesWritten,
    };
  }
}
