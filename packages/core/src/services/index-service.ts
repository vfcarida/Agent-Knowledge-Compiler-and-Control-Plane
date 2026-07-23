/**
 * @module services/index-service
 * @description Generates and maintains `index.md` files for OKF bundle directories.
 *
 * Per OKF spec §3.1, `index.md` provides progressive disclosure by listing
 * the contents of a directory as a structured Markdown table. This service
 * scans a directory for `.md` documents, reads their frontmatter, and
 * produces a human- and LLM-readable listing.
 */

import path from "node:path";

import type {
  IFileSystemAdapter,
  IFrontmatterParser,
  IIndexService,
} from "../domain/interfaces.js";

/**
 * Reserved filenames excluded from index generation.
 * These files are structural / metadata and should not appear as entries.
 */
const RESERVED_FILENAMES: ReadonlySet<string> = new Set(["index.md", "log.md"]);

/**
 * Generates `index.md` files for directories within an OKF bundle.
 *
 * @example
 * ```ts
 * const indexService = new IndexService(fsAdapter, parser, '/career-bundle');
 * const markdown = await indexService.generate('/career-bundle/skills');
 * ```
 */
export class IndexService implements IIndexService {
  private readonly fsAdapter: IFileSystemAdapter;
  private readonly parser: IFrontmatterParser;
  private readonly bundleRoot: string;

  /**
   * @param fsAdapter   - Filesystem abstraction for I/O operations
   * @param parser      - Frontmatter parser for extracting metadata from documents
   * @param bundleRoot  - Absolute path to the OKF bundle root (used for parser context)
   */
  constructor(
    fsAdapter: IFileSystemAdapter,
    parser: IFrontmatterParser,
    bundleRoot: string,
  ) {
    this.fsAdapter = fsAdapter;
    this.parser = parser;
    this.bundleRoot = bundleRoot;
  }

  /**
   * Generate an `index.md` file for the given directory.
   *
   * Scans child `.md` files (excluding reserved filenames), reads their
   * frontmatter for title, type, and description, then writes a Markdown
   * table to `<directoryPath>/index.md`.
   *
   * @param directoryPath - Absolute path to the directory to index
   * @returns The generated Markdown content string
   */
  async generate(directoryPath: string): Promise<string> {
    const relativePaths = await this.fsAdapter.listFiles(directoryPath);
    const dirName = path.basename(directoryPath);

    // Collect metadata from each non-reserved .md file
    const entries: Array<{
      title: string;
      type: string;
      description: string;
      fileName: string;
    }> = [];

    for (const relativePath of relativePaths) {
      const fileName = path.basename(relativePath);

      if (RESERVED_FILENAMES.has(fileName)) {
        continue;
      }

      const fullPath = path.join(directoryPath, relativePath);

      try {
        const rawContent = await this.fsAdapter.readFile(fullPath);
        const doc = this.parser.parse(rawContent, fullPath, this.bundleRoot);

        entries.push({
          title: doc.frontmatter.title ?? fileName.replace(/\.md$/, ""),
          type: doc.frontmatter.type,
          description: doc.frontmatter.description ?? "",
          fileName,
        });
      } catch (error: unknown) {
        // Skip files that fail to parse — don't break index generation
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[IndexService] Skipping "${relativePath}": ${message}`);
      }
    }

    // Build the index Markdown content
    const timestamp = new Date().toISOString();
    const lines: string[] = [
      "---",
      "type: Index",
      `title: ${dirName}`,
      `description: Auto-generated index for ${dirName}`,
      `timestamp: ${timestamp}`,
      "---",
      "",
      `# ${dirName}`,
      "",
      "| Title | Type | Description |",
      "|-------|------|-------------|",
    ];

    for (const entry of entries) {
      const escapedTitle = entry.title.replace(/\|/g, "\\|");
      const escapedType = entry.type.replace(/\|/g, "\\|");
      const escapedDesc = entry.description.replace(/\|/g, "\\|");
      lines.push(
        `| [${escapedTitle}](./${entry.fileName}) | ${escapedType} | ${escapedDesc} |`,
      );
    }

    lines.push(""); // Trailing newline

    const content = lines.join("\n");

    // Write index.md to the directory
    const indexPath = path.join(directoryPath, "index.md");
    await this.fsAdapter.writeFile(indexPath, content);

    return content;
  }
}
