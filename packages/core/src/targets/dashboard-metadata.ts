import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { CompileTarget, TargetConfig, TargetOutput } from "./types.js";
import type { AgentKnowledgeIR } from "../ir/types.js";

export class DashboardMetadataTarget implements CompileTarget {
  readonly targetType = "dashboard-metadata";

  async compile(
    ir: AgentKnowledgeIR,
    config: TargetConfig,
  ): Promise<TargetOutput> {
    const defaultOut = "dist/akcp/dashboard-metadata.json";
    const outPath = path.resolve(process.cwd(), config.out || defaultOut);
    const outDir = path.dirname(outPath);

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const metadata = {
      bundleId: ir.bundleId,
      timestamp: new Date().toISOString(),
      conceptsCount: ir.concepts.length,
      capabilitiesCount: ir.capabilities?.length || 0,
      linksCount: ir.links?.length || 0,
      policiesCount: 0, // This is loaded externally typically, or could be extracted from IR if available
      health: {
        status: "healthy",
        lastCompiled: new Date().toISOString()
      },
      concepts: ir.concepts.map(c => ({
        id: c.conceptId,
        type: c.type,
        title: c.frontmatter?.title || c.conceptId,
      })),
      capabilities: ir.capabilities || [],
    };

    const content = JSON.stringify(metadata, null, 2);
    fs.writeFileSync(outPath, content, "utf-8");

    const hash = crypto.createHash("sha256").update(content).digest("hex");

    return {
      targetType: this.targetType,
      outputPath: outPath,
      hash,
      bytesWritten: Buffer.byteLength(content, "utf8"),
    };
  }
}
