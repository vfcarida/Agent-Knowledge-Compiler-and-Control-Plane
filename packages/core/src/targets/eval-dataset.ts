import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { CompileTarget, TargetConfig, TargetOutput } from "./types.js";
import type { AgentKnowledgeIR } from "../ir/types.js";

export class EvalDatasetTarget implements CompileTarget {
  public readonly targetType = "eval-dataset";

  async compile(
    ir: AgentKnowledgeIR,
    config: TargetConfig,
  ): Promise<TargetOutput> {
    const outPath = path.resolve(process.cwd(), config.out);
    const outDir = path.dirname(outPath);

    await fs.mkdir(outDir, { recursive: true });

    // Minimalist implementation: dump concept IDs and basic metadata as JSONL
    // Future work: generate full QA pairs
    let content = "";

    for (const concept of ir.concepts) {
      const line = JSON.stringify({
        input: `What is ${concept.conceptId}?`,
        expected_context: [concept.conceptId],
        metadata: {
          type: concept.type,
          format: concept.source?.format,
        },
      });
      content += line + "\n";
    }

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
