import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { CompileTarget, TargetConfig, TargetOutput } from "./types.js";
import type { AgentKnowledgeIR } from "../ir/types.js";

export class OkfBundleTarget implements CompileTarget {
  public readonly targetType = "okf-bundle";

  async compile(
    ir: AgentKnowledgeIR,
    config: TargetConfig,
  ): Promise<TargetOutput> {
    const outDir = path.resolve(process.cwd(), config.out);

    // For OKF bundles, the output is a directory.
    await fs.mkdir(outDir, { recursive: true });

    let totalBytes = 0;
    const hash = createHash("sha256");

    // Create frontmatter parser logic just to format it back, or just do it manually
    for (const concept of ir.concepts) {
      const fileName = `${concept.conceptId}.md`;
      const filePath = path.join(outDir, fileName);

      const frontmatterYaml = Object.entries(concept.frontmatter)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join("\n");

      const content = `---\ntype: ${concept.type}\n${frontmatterYaml}\n---\n\n${concept.body}`;

      await fs.writeFile(filePath, content, "utf-8");

      hash.update(content);
      totalBytes += Buffer.byteLength(content, "utf8");
    }

    return {
      targetType: this.targetType,
      outputPath: outDir,
      hash: hash.digest("hex"),
      bytesWritten: totalBytes,
    };
  }
}
