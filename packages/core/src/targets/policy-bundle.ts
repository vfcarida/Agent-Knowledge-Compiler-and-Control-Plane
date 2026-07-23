import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { CompileTarget, TargetConfig, TargetOutput } from "./types.js";
import type { AgentKnowledgeIR } from "../ir/types.js";

export class PolicyBundleTarget implements CompileTarget {
  public readonly targetType = "policy-bundle";

  async compile(
    ir: AgentKnowledgeIR,
    config: TargetConfig,
  ): Promise<TargetOutput> {
    const outPath = path.resolve(process.cwd(), config.out);
    const outDir = path.dirname(outPath);

    await fs.mkdir(outDir, { recursive: true });

    // Generates a JSON dump of the control plane policies
    const policyDump = ir.policies || {};

    const content = JSON.stringify(policyDump, null, 2);

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
