/**
 * @module domain/interfaces
 * @description Contracts for infrastructure and service layers.
 *
 * All dependencies are expressed as interfaces to enable:
 * - Constructor-based dependency injection
 * - Easy mocking in unit tests (no FS or network calls in tests)
 * - Swappable implementations (e.g., in-memory adapter for testing)
 */

import type { LogEntry, OKFDocument, OKFFrontmatter } from './types.js';

// ─── Infrastructure Interfaces ──────────────────────────────────────────────────

/**
 * Abstraction over filesystem operations.
 * Implementations wrap Node.js `fs/promises` or provide in-memory alternatives.
 */
export interface IFileSystemAdapter {
  /** Read file contents as UTF-8 string. */
  readFile(filePath: string): Promise<string>;

  /** Write string content to a file, creating parent directories as needed. */
  writeFile(filePath: string, content: string): Promise<void>;

  /** Check if a file or directory exists at the given path. */
  exists(filePath: string): Promise<boolean>;

  /** Create a directory (and parents) if it doesn't exist. */
  mkdir(dirPath: string): Promise<void>;

  /** Delete a file at the given path. */
  deleteFile(filePath: string): Promise<void>;

  /**
   * List all files in a directory recursively.
   * Returns relative paths from the given directory.
   */
  listFiles(dirPath: string, pattern?: string): Promise<string[]>;
}

/**
 * Abstraction for parsing and serializing OKF documents (Markdown + YAML frontmatter).
 */
export interface IFrontmatterParser {
  /**
   * Parse a raw Markdown string into an OKFDocument.
   * @throws {OKFParseError} if the content is malformed
   * @throws {OKFValidationError} if required frontmatter fields are missing
   */
  parse(rawContent: string, filePath: string, bundleRoot: string): OKFDocument;

  /**
   * Serialize an OKFDocument back into a Markdown string with YAML frontmatter.
   */
  serialize(frontmatter: OKFFrontmatter, body: string): string;
}

// ─── Repository Interfaces ──────────────────────────────────────────────────────

/**
 * Repository pattern for OKF document persistence.
 * Provides CRUD operations over the OKF knowledge bundle.
 */
export interface IOKFRepository {
  /**
   * Find a document by its concept ID.
   * @param conceptId - Path within the bundle without `.md` extension (e.g., `skills/typescript`)
   * @returns The parsed document, or `null` if not found
   */
  findById(conceptId: string): Promise<OKFDocument | null>;

  /**
   * Find all documents matching a given OKF type.
   * @param type - The `type` frontmatter value to filter by
   */
  findByType(type: string): Promise<OKFDocument[]>;

  /** Return all OKF documents in the bundle. */
  findAll(): Promise<OKFDocument[]>;

  /**
   * Persist a document to disk.
   * Creates the file and parent directories if they don't exist.
   * @throws {OKFValidationError} if the document has invalid frontmatter
   */
  save(document: OKFDocument): Promise<void>;

  /**
   * Delete a document by its concept ID.
   * @throws {OKFFileNotFoundError} if the document doesn't exist
   */
  delete(conceptId: string): Promise<void>;
}

// ─── Service Interfaces ─────────────────────────────────────────────────────────

/**
 * Service for generating and maintaining `index.md` files.
 * Per OKF spec §3.1, `index.md` provides progressive disclosure
 * by listing the contents of a directory.
 */
export interface IIndexService {
  /**
   * Generate an `index.md` file for the given directory.
   * Scans child files, reads their frontmatter, and produces a Markdown listing.
   * @param directoryPath - Absolute path to the directory to index
   */
  generate(directoryPath: string): Promise<string>;
}

/**
 * Service for managing the chronological `log.md` file.
 * Per OKF spec §3.1, `log.md` records update history.
 */
export interface ILogService {
  /**
   * Append a new entry to the log.
   * Entries are prepended (newest first) with ISO 8601 timestamps.
   */
  append(entry: LogEntry): Promise<void>;

  /** Read all log entries, ordered newest first. */
  getEntries(): Promise<LogEntry[]>;
}
