import { createHash } from "node:crypto";
import path from "node:path";
import type { IFileSystemAdapter } from "../domain/interfaces.js";
import type {
  ConnectorConfig,
  KnowledgeSourceConnector,
  RawKnowledgeItem,
} from "./types.js";

export class OpenWikiConnector implements KnowledgeSourceConnector {
  public readonly connectorType = "openwiki";

  constructor(private readonly fsAdapter: IFileSystemAdapter) {}

  async ingest(config: ConnectorConfig): Promise<RawKnowledgeItem[]> {
    if (!config.path) {
      throw new Error(
        `OpenWikiConnector requires a 'path' config pointing to the openwiki directory.`,
      );
    }

    const items: RawKnowledgeItem[] = [];
    const sourceDir = path.resolve(process.cwd(), config.path);

    if (!(await this.fsAdapter.exists(sourceDir))) {
      throw new Error(`OpenWiki directory not found: ${sourceDir}`);
    }

    const files = await this.fsAdapter.listFiles(sourceDir);

    for (const relativePath of files) {
      if (
        config.exclude &&
        config.exclude.some((ex) => relativePath.includes(ex))
      ) {
        continue;
      }

      const filePath = path.join(sourceDir, relativePath);
      const content = await this.fsAdapter.readFile(filePath);

      const hash = createHash("sha256").update(content).digest("hex");

      // We preserve openwiki nuances in metadata
      items.push({
        sourceUri: `file://${filePath}`,
        contentHash: hash,
        metadata: {
          relativePath,
          originalFormat: "openwiki/markdown",
          isIndex:
            path.basename(relativePath).toLowerCase() === "readme.md" ||
            path.basename(relativePath).toLowerCase() === "index.md",
        },
        rawContent: content,
      });
    }

    return items;
  }
}
