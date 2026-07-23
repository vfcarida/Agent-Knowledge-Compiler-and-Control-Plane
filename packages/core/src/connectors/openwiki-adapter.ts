import { createHash } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import * as yaml from "js-yaml";
import type {
  DetectionResult,
  SourceDocument,
  NormalizedKnowledgeDocument,
  SourceAdapter,
  SourceProvenanceRecord,
} from "./types.js";

// Helper to check if it has YAML frontmatter
function extractFrontmatter(content: string): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  frontmatter: any;
  markdown: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  if (match) {
    try {
      return {
        frontmatter: yaml.load(match[1] as string) || {},
        markdown: (match[2] as string).trim(),
      };
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    } catch (e) {
      return { frontmatter: {}, markdown: content };
    }
  }
  return { frontmatter: {}, markdown: content };
}

export class OpenWikiAdapter implements SourceAdapter {
  name = "openwiki-adapter";
  version = "1.0.0";

  async detect(inputPath: string): Promise<DetectionResult> {
    try {
      const stats = await fs.promises.stat(inputPath);
      if (!stats.isDirectory()) {
        return {
          isSupported: false,
          confidence: 0,
          reason: "Input must be a directory",
        };
      }
      // Check for common openwiki markers (e.g. index.md, README.md, .github)
      const files = await fs.promises.readdir(inputPath);
      const hasMarkdown = files.some((f) => f.endsWith(".md"));

      if (hasMarkdown) {
        return {
          isSupported: true,
          confidence: 0.8,
          reason: "Directory contains Markdown files typical of OpenWiki",
        };
      }
      return {
        isSupported: false,
        confidence: 0,
        reason: "No Markdown files found",
      };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      return { isSupported: false, confidence: 0, reason: e.message };
    }
  }

  async scan(inputPath: string): Promise<SourceDocument[]> {
    const documents: SourceDocument[] = [];

    async function walk(dir: string) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith(".")) await walk(fullPath);
        } else if (entry.name.endsWith(".md")) {
          const rawContent = await fs.promises.readFile(fullPath, "utf-8");
          const hash = createHash("sha256").update(rawContent).digest("hex");
          documents.push({
            sourceUri: `file://${fullPath.replace(/\\/g, "/")}`,
            rawContent,
            hash,
          });
        }
      }
    }

    await walk(inputPath);
    return documents;
  }

  async normalize(
    document: SourceDocument,
  ): Promise<NormalizedKnowledgeDocument> {
    const { frontmatter, markdown } = extractFrontmatter(document.rawContent);

    // Fallback logic for Document type
    if (!frontmatter.type) {
      frontmatter.type = "Document";
    }

    const targetDocumentId =
      frontmatter.id ||
      createHash("md5").update(document.sourceUri).digest("hex");

    const provenance: SourceProvenanceRecord = {
      sourceUri: document.sourceUri,
      sourceType: "openwiki",
      sourceHash: document.hash,
      importedAt: new Date().toISOString(),
      adapterName: this.name,
      adapterVersion: this.version,
      targetDocumentId,
    };

    return {
      type: frontmatter.type,
      frontmatter,
      markdown,
      provenance,
    };
  }
}
