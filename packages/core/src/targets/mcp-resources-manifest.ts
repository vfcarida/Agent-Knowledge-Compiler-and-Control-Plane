import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { CompileTarget, TargetConfig, TargetOutput } from "./types.js";
import type { AgentKnowledgeIR } from "../ir/types.js";

export class McpResourcesManifestTarget implements CompileTarget {
  public readonly targetType = "mcp-resources-manifest";

  async compile(
    ir: AgentKnowledgeIR,
    config: TargetConfig,
  ): Promise<TargetOutput> {
    const outPath = path.resolve(process.cwd(), config.out);
    const outDir = path.dirname(outPath);

    await fs.mkdir(outDir, { recursive: true });

    // Generates a JSON manifest for MCP servers to register resources
    const manifest = {
      version: "1.0",
      bundleId: ir.bundleId,
      resources: ir.concepts.map((c) => ({
        uri: `knowledge://${ir.bundleId}/${c.conceptId}`,
        name: c.conceptId,
        mimeType:
          c.source?.format === "openapi/endpoint"
            ? "application/json"
            : "text/markdown",
        description: `Knowledge asset: ${c.conceptId} (Type: ${c.type})`,
      })),
    };

    const content = JSON.stringify(manifest, null, 2);

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
