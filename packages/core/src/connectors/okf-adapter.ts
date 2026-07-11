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

function extractFrontmatter(content: string): {
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
    } catch (e) {
      return { frontmatter: {}, markdown: content };
    }
  }
  return { frontmatter: {}, markdown: content };
}

export class OkfAdapter implements SourceAdapter {
  name = "okf-adapter";
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

      const files = await fs.promises.readdir(inputPath);
      const hasIndex = files.includes("index.md");

      if (hasIndex) {
        return {
          isSupported: true,
          confidence: 1.0,
          reason: "Directory contains OKF index.md",
        };
      }
      return {
        isSupported: false,
        confidence: 0.5,
        reason: "No index.md found, but might be an incomplete OKF directory",
      };
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

    // OKF specific normalizations
    if (!frontmatter.type) {
      frontmatter.type = "UnknownType";
    }

    const targetDocumentId =
      frontmatter.id ||
      createHash("md5").update(document.sourceUri).digest("hex");

    const provenance: SourceProvenanceRecord = {
      sourceUri: document.sourceUri,
      sourceType: "okf",
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
