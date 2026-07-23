/**
 * @module services/okf-document-service
 * @description High-level orchestration service for OKF document operations.
 *
 * Coordinates the {@link IOKFRepository}, {@link IIndexService}, and
 * {@link ILogService} to provide complete document lifecycle management.
 * Every mutation (create, update, delete) triggers index regeneration
 * and a log entry so the bundle remains self-documenting.
 */

import path from "node:path";

import type {
  IIndexService,
  ILogService,
  IOKFRepository,
} from "../domain/interfaces.js";
import { OKFFileNotFoundError } from "../domain/errors.js";
import type {
  CareerContext,
  OKFDocument,
  OKFFrontmatter,
} from "../domain/types.js";
import { OKFDocumentType } from "../domain/types.js";

/**
 * Orchestrates document CRUD, index regeneration, and change logging.
 *
 * @example
 * ```ts
 * const service = new OKFDocumentService(repo, indexService, logService, '/career-bundle');
 * await service.createDocument(
 *   { type: 'Skill', title: 'TypeScript' },
 *   '## Details\nStrong experience with TypeScript.',
 *   'skills/typescript',
 * );
 * ```
 */
export class OKFDocumentService {
  private readonly repository: IOKFRepository;
  private readonly indexService: IIndexService;
  private readonly logService: ILogService;
  private readonly bundleRoot: string;

  /**
   * @param repository   - OKF document repository for persistence
   * @param indexService - Service for regenerating `index.md` files
   * @param logService   - Service for appending to `log.md`
   * @param bundleRoot   - Absolute path to the OKF bundle root directory
   */
  constructor(
    repository: IOKFRepository,
    indexService: IIndexService,
    logService: ILogService,
    bundleRoot: string,
  ) {
    this.repository = repository;
    this.indexService = indexService;
    this.logService = logService;
    this.bundleRoot = bundleRoot;
  }

  /**
   * Get the root path of the bundle.
   */
  get bundleRootPath(): string {
    return this.bundleRoot;
  }

  /**
   * Create a new OKF document.
   *
   * Saves the document via the repository, regenerates the parent
   * directory's `index.md`, and records the creation in `log.md`.
   *
   * Supports calling with a single OKFDocument object or separate arguments.
   *
   * @param frontmatterOrDoc - YAML frontmatter for the new document, or the full OKFDocument object
   * @param body             - Markdown body content (required if first argument is frontmatter)
   * @param conceptId        - Concept ID (e.g. `skills/typescript`, required if first argument is frontmatter)
   */
  async createDocument(
    frontmatterOrDoc: OKFFrontmatter | OKFDocument,
    body?: string,
    conceptId?: string,
  ): Promise<void> {
    let document: OKFDocument;

    if (this.isOKFDocument(frontmatterOrDoc)) {
      document = { ...frontmatterOrDoc };
      if (!document.filePath) {
        document.filePath = path.join(
          this.bundleRoot,
          `${document.conceptId}.md`,
        );
      }
    } else {
      if (body === undefined || conceptId === undefined) {
        throw new Error(
          "body and conceptId are required when passing frontmatter separately",
        );
      }
      const filePath = path.join(this.bundleRoot, `${conceptId}.md`);
      document = {
        frontmatter: frontmatterOrDoc,
        body,
        filePath,
        conceptId,
      };
    }

    await this.repository.save(document);

    // Regenerate the parent directory's index
    const parentDir = path.dirname(document.filePath);
    await this.indexService.generate(parentDir);

    // Log the creation
    await this.logService.append({
      timestamp: new Date().toISOString(),
      action: "created",
      conceptId: document.conceptId,
      details: `Created document: ${document.frontmatter.title ?? document.conceptId}`,
    });
  }

  /**
   * Update an existing OKF document.
   *
   * Finds the document by concept ID, merges the frontmatter updates,
   * optionally replaces the body, saves, and logs the update.
   *
   * Supports calling with a full OKFDocument object directly.
   *
   * @param conceptIdOrDoc - Concept ID of the document to update, or the updated OKFDocument object
   * @param updates        - Partial frontmatter fields to merge (ignored if first argument is OKFDocument)
   * @param bodyUpdate     - Optional new body content (replaces existing if provided)
   * @returns The updated document
   * @throws {OKFFileNotFoundError} When no document exists for the given concept ID
   */
  async updateDocument(
    conceptIdOrDoc: string | OKFDocument,
    updates?: Partial<OKFFrontmatter>,
    bodyUpdate?: string,
  ): Promise<OKFDocument> {
    let conceptId: string;
    let frontmatterUpdates: Partial<OKFFrontmatter>;
    let newBody: string | undefined;

    if (typeof conceptIdOrDoc === "string") {
      conceptId = conceptIdOrDoc;
      frontmatterUpdates = updates ?? {};
      newBody = bodyUpdate;
    } else {
      conceptId = conceptIdOrDoc.conceptId;
      frontmatterUpdates = conceptIdOrDoc.frontmatter;
      newBody = conceptIdOrDoc.body;
    }

    const existing = await this.repository.findById(conceptId);

    if (!existing) {
      const filePath = path.join(this.bundleRoot, `${conceptId}.md`);
      throw new OKFFileNotFoundError(filePath);
    }

    // Merge frontmatter updates
    const mergedFrontmatter: OKFFrontmatter =
      typeof conceptIdOrDoc === "string"
        ? {
            ...existing.frontmatter,
            ...frontmatterUpdates,
            timestamp: new Date().toISOString(),
          }
        : {
            ...frontmatterUpdates,
            type: existing.frontmatter.type,
            timestamp: new Date().toISOString(),
          };

    const updatedDocument: OKFDocument = {
      frontmatter: mergedFrontmatter,
      body: newBody !== undefined ? newBody : existing.body,
      filePath: existing.filePath,
      conceptId: existing.conceptId,
    };

    await this.repository.save(updatedDocument);

    // Log the update
    const updatedFields =
      typeof conceptIdOrDoc === "string"
        ? Object.keys(frontmatterUpdates)
        : Object.keys(updates ?? {});

    await this.logService.append({
      timestamp: new Date().toISOString(),
      action: "updated",
      conceptId,
      details: `Updated fields: ${updatedFields.join(", ")}`,
    });

    return updatedDocument;
  }

  /**
   * Delete an OKF document by its concept ID.
   *
   * Removes the file via the repository, regenerates the parent
   * directory's `index.md`, and records the deletion in `log.md`.
   *
   * @param conceptId - Concept ID of the document to delete
   * @throws {OKFFileNotFoundError} When no document exists for the given concept ID
   */
  async deleteDocument(conceptId: string): Promise<void> {
    const filePath = path.join(this.bundleRoot, `${conceptId}.md`);

    await this.repository.delete(conceptId);

    // Regenerate the parent directory's index
    const parentDir = path.dirname(filePath);
    await this.indexService.generate(parentDir);

    // Log the deletion
    await this.logService.append({
      timestamp: new Date().toISOString(),
      action: "deleted",
      conceptId,
      details: `Deleted document: ${conceptId}`,
    });
  }

  /**
   * Aggregate all documents grouped by type into a {@link CareerContext}.
   *
   * Used by the MCP `read_career_context` tool to provide a comprehensive
   * snapshot of the user's professional profile to LLMs.
   *
   * @returns A {@link CareerContext} object with documents grouped by type
   */
  async getCareerContext(): Promise<CareerContext> {
    const [
      skills,
      experiences,
      education,
      certificates,
      projects,
      preferences,
      applications,
    ] = await Promise.all([
      this.repository.findByType(OKFDocumentType.Skill),
      this.repository.findByType(OKFDocumentType.Experience),
      this.repository.findByType(OKFDocumentType.Education),
      this.repository.findByType(OKFDocumentType.Certificate),
      this.repository.findByType(OKFDocumentType.Project),
      this.repository.findByType(OKFDocumentType.Preference),
      this.repository.findByType(OKFDocumentType.Application),
    ]);

    return {
      skills,
      experiences,
      education,
      certificates,
      projects,
      preferences,
      applications,
    };
  }

  /**
   * Retrieve a single document by concept ID.
   *
   * Delegates directly to the repository's {@link IOKFRepository.findById}.
   *
   * @param conceptId - Concept ID to look up
   * @returns The parsed document, or `null` if not found
   */
  async getDocument(conceptId: string): Promise<OKFDocument | null> {
    return this.repository.findById(conceptId);
  }

  /**
   * Type guard to check if an object implements {@link OKFDocument}.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isOKFDocument(obj: any): obj is OKFDocument {
    return (
      obj &&
      typeof obj === "object" &&
      "frontmatter" in obj &&
      "body" in obj &&
      "conceptId" in obj
    );
  }
}
