import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { CompileTarget, TargetConfig, TargetOutput } from "./types.js";
import type { AgentKnowledgeIR } from "../ir/types.js";
import { buildSemanticGraph } from "../graph/build-graph.js";
import { computeImpactMap } from "../graph/impact-analysis.js";

export class GraphJsonTarget implements CompileTarget {
  public readonly targetType = "graph-json";

  async compile(
    ir: AgentKnowledgeIR,
    config: TargetConfig,
  ): Promise<TargetOutput> {
    const outPath = path.resolve(process.cwd(), config.out);
    const outDir = path.dirname(outPath);

    await fs.mkdir(outDir, { recursive: true });

    const graph = buildSemanticGraph(ir);
    const impactMap = computeImpactMap(graph.edges);

    const graphData = {
      nodes: graph.nodes,
      edges: graph.edges,
      summary: graph.summary,
      impactMap,
    };

    const content = JSON.stringify(graphData, null, 2);

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
