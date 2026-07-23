import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { CompileTarget, TargetConfig, TargetOutput } from "./types.js";
import type { AgentKnowledgeIR } from "../ir/types.js";
import { FrontmatterParser } from "../infrastructure/frontmatter-parser.js";

export class OpenWikiDocsTarget implements CompileTarget {
  public readonly targetType = "openwiki";

  async compile(
    ir: AgentKnowledgeIR,
    config: TargetConfig,
  ): Promise<TargetOutput> {
    const outDir = path.resolve(process.cwd(), config.out);

    await fs.mkdir(outDir, { recursive: true });

    let totalBytes = 0;
    const hash = createHash("sha256");
    const parser = new FrontmatterParser();

    // Generate an index.md
    let indexContent = `# Context Knowledge\n\nGenerated automatically from AKCP Compiler.\n\n`;

    for (const concept of ir.concepts) {
      const fileName = `${concept.conceptId.replace(/[\\/]/g, "-")}.md`;
      const filePath = path.join(outDir, fileName);

      // Restore frontmatter to ensure OpenWiki interoperability
      const frontmatter = concept.frontmatter || {
        type: concept.type || "Document",
      };
      const bodyWithHeading = `# ${concept.conceptId}\n\n${concept.body}`;

      const content = parser.serialize(
        frontmatter as import("../domain/types.js").OKFFrontmatter,
        bodyWithHeading,
      );

      await fs.writeFile(filePath, content, "utf-8");

      hash.update(content);
      totalBytes += Buffer.byteLength(content, "utf8");

      indexContent += `- [${concept.conceptId}](./${fileName})\n`;
    }

    const indexPath = path.join(outDir, "index.md");
    await fs.writeFile(indexPath, indexContent, "utf-8");
    hash.update(indexContent);
    totalBytes += Buffer.byteLength(indexContent, "utf8");

    // Generate OpenWiki metadata manifest
    const metadata = {
      generatedAt: ir.timestamp || new Date().toISOString(),
      targetType: this.targetType,
      bundleId: ir.bundleId,
      sourceHashes: ir.sourceHashes || {},
      compilerVersion: "AKCP-v1",
    };

    const metadataPath = path.join(outDir, ".akcp-openwiki-metadata.json");
    const metadataContent = JSON.stringify(metadata, null, 2);
    await fs.writeFile(metadataPath, metadataContent, "utf-8");
    hash.update(metadataContent);
    totalBytes += Buffer.byteLength(metadataContent, "utf8");

    return {
      targetType: this.targetType,
      outputPath: outDir,
      hash: hash.digest("hex"),
      bytesWritten: totalBytes,
    };
  }
}
