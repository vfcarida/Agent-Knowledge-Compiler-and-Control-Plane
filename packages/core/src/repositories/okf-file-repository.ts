/**
 * @module repositories/okf-file-repository
 * @description File-system–based repository for OKF documents.
 *
 * Implements the {@link IOKFRepository} contract using an injected
 * {@link IFileSystemAdapter} for disk I/O and an {@link IFrontmatterParser}
 * for Markdown + YAML round-tripping.
 *
 * ## Reserved filenames
 *
 * Per OKF spec §3.1, `index.md` and `log.md` are reserved for metadata.
 * This repository silently skips them during listing and lookup operations
 * to avoid treating infrastructure files as career-concept documents.
 */

import path from "node:path";

import { OKFFileNotFoundError, OKFValidationError } from "../domain/errors.js";
import type {
  IFileSystemAdapter,
  IFrontmatterParser,
  IOKFRepository,
} from "../domain/interfaces.js";
import type { OKFDocument } from "../domain/types.js";
import { OKFFrontmatterSchema } from "../domain/types.js";

/**
 * Reserved filenames that are excluded from document listing and lookup.
 * These files serve structural / metadata purposes per OKF spec §3.1.
 */
const RESERVED_FILENAMES: ReadonlySet<string> = new Set(["index.md", "log.md"]);

/**
 * File-system–backed implementation of {@link IOKFRepository}.
 *
 * @example
 * ```ts
 * const repo = new OKFFileRepository(fsAdapter, parser, '/career-bundle');
 * const doc = await repo.findById('skills/typescript');
 * ```
 */
export class OKFFileRepository implements IOKFRepository {
  private readonly fsAdapter: IFileSystemAdapter;
  private readonly parser: IFrontmatterParser;
  private readonly bundleRoot: string;

  /**
   * @param fsAdapter   - Filesystem abstraction for I/O operations
   * @param parser      - Frontmatter parser / serializer
   * @param bundleRoot  - Absolute path to the OKF bundle root directory
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

  // ─── Query Methods ──────────────────────────────────────────────────────────

  /**
   * Find a document by its concept ID.
   *
   * The concept ID is a path relative to the bundle root **without** the `.md`
   * extension (e.g. `skills/typescript`). Reserved filenames are never returned.
   *
   * @param conceptId - Concept ID within the bundle (e.g. `skills/typescript`)
   * @returns The parsed {@link OKFDocument}, or `null` if not found or reserved
   */
  async findById(conceptId: string): Promise<OKFDocument | null> {
    const filePath = path.join(this.bundleRoot, `${conceptId}.md`);
    const fileName = path.basename(filePath);

    // Skip reserved infrastructure files
    if (RESERVED_FILENAMES.has(fileName)) {
      return null;
    }

    const fileExists = await this.fsAdapter.exists(filePath);
    if (!fileExists) {
      return null;
    }

    const rawContent = await this.fsAdapter.readFile(filePath);
    return this.parser.parse(rawContent, filePath, this.bundleRoot);
  }

  /**
   * Find all documents matching a given OKF document type.
   *
   * @param type - The frontmatter `type` value to filter by (e.g. `'Skill'`)
   * @returns Array of matching documents (may be empty)
   */
  async findByType(type: string): Promise<OKFDocument[]> {
    const allDocs = await this.findAll();
    return allDocs.filter((doc) => doc.frontmatter.type === type);
  }

  /**
   * Return every OKF document in the bundle.
   *
   * Walks the bundle root recursively, reading all `.md` files while
   * skipping reserved filenames. Individual parse errors are caught and
   * logged to `console.error` so that a single malformed file does not
   * prevent the rest of the bundle from loading.
   *
   * @returns Array of successfully parsed documents
   */
  async findAll(): Promise<OKFDocument[]> {
    const relativePaths = await this.fsAdapter.listFiles(this.bundleRoot);
    const documents: OKFDocument[] = [];

    for (const relativePath of relativePaths) {
      const fileName = path.basename(relativePath);

      // Skip reserved filenames
      if (RESERVED_FILENAMES.has(fileName)) {
        continue;
      }

      const fullPath = path.join(this.bundleRoot, relativePath);

      try {
        const rawContent = await this.fsAdapter.readFile(fullPath);
        const doc = this.parser.parse(rawContent, fullPath, this.bundleRoot);
        documents.push(doc);
      } catch (error: unknown) {
        // Log and continue — one bad file should not break the whole bundle
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `[OKFFileRepository] Skipping "${relativePath}": ${message}`,
        );
      }
    }

    return documents;
  }

  // ─── Mutation Methods ───────────────────────────────────────────────────────

  /**
   * Persist an OKF document to disk.
   *
   * Validates frontmatter against {@link OKFFrontmatterSchema} before writing.
   * If `document.filePath` is empty the path is derived from the bundle root
   * and the document's concept ID.
   *
   * @param document - The document to save
   * @throws {OKFValidationError} When frontmatter fails schema validation
   */
  async save(document: OKFDocument): Promise<void> {
    // Validate frontmatter before persisting
    const validation = OKFFrontmatterSchema.safeParse(document.frontmatter);

    if (!validation.success) {
      const issues = validation.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");

      throw new OKFValidationError(`Frontmatter validation failed: ${issues}`, {
        conceptId: document.conceptId,
        issues: validation.error.issues,
      });
    }

    // Resolve the target file path
    const filePath = document.filePath
      ? document.filePath
      : path.join(this.bundleRoot, `${document.conceptId}.md`);

    // Serialize and write
    const content = this.parser.serialize(document.frontmatter, document.body);

    await this.fsAdapter.writeFile(filePath, content);
  }

  /**
   * Delete a document by its concept ID.
   *
   * @param conceptId - Concept ID of the document to delete
   * @throws {OKFFileNotFoundError} When no document exists for the given concept ID
   */
  async delete(conceptId: string): Promise<void> {
    const filePath = path.join(this.bundleRoot, `${conceptId}.md`);
    const fileExists = await this.fsAdapter.exists(filePath);

    if (!fileExists) {
      throw new OKFFileNotFoundError(filePath);
    }

    await this.fsAdapter.deleteFile(filePath);
  }
}
