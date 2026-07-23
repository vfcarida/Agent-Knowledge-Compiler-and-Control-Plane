/**
 * @module domain/errors
 * @description Custom error classes for the OKF engine and MCP tools.
 *
 * All errors produce structured, LLM-friendly messages so that an AI client
 * receiving the error can understand the problem and self-correct its request.
 * Each error includes:
 * - A clear, human-readable `message`
 * - A machine-readable `code` for programmatic handling
 * - Contextual `details` about what went wrong
 */

/**
 * Base error class for all OKF-related errors.
 * Extends `Error` with a `code` and optional `details` for structured reporting.
 */
export class OKFError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "OKFError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Returns a structured representation suitable for LLM consumption.
   */
  toJSON(): Record<string, unknown> {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Thrown when an OKF document fails frontmatter validation.
 *
 * @example
 * ```
 * // Missing required "type" field
 * throw new OKFValidationError(
 *   'Frontmatter validation failed: the "type" field is required by OKF v0.1 spec.',
 *   { filePath: 'skills/unknown.md', missingFields: ['type'] }
 * );
 * ```
 */
export class OKFValidationError extends OKFError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      `OKF Validation Error: ${message}. ` +
        'Ensure the document has valid YAML frontmatter with at least a "type" field. ' +
        "See OKF v0.1 spec §4.1 for required fields.",
      "OKF_VALIDATION_ERROR",
      details,
    );
    this.name = "OKFValidationError";
  }
}

/**
 * Thrown when an OKF document cannot be found at the expected path.
 */
export class OKFFileNotFoundError extends OKFError {
  constructor(filePath: string) {
    super(
      `OKF File Not Found: No document exists at "${filePath}". ` +
        "Verify the concept ID or file path is correct and the OKF bundle directory is properly configured.",
      "OKF_FILE_NOT_FOUND",
      { filePath },
    );
    this.name = "OKFFileNotFoundError";
  }
}

/**
 * Thrown when attempting to create a document with a concept ID that already exists.
 */
export class OKFDuplicateConceptError extends OKFError {
  constructor(conceptId: string) {
    super(
      `OKF Duplicate Concept: A document with concept ID "${conceptId}" already exists. ` +
        "Use a unique concept ID or update the existing document instead.",
      "OKF_DUPLICATE_CONCEPT",
      { conceptId },
    );
    this.name = "OKFDuplicateConceptError";
  }
}

/**
 * Thrown when the YAML frontmatter or Markdown content cannot be parsed.
 */
export class OKFParseError extends OKFError {
  constructor(filePath: string, reason: string) {
    super(
      `OKF Parse Error: Failed to parse "${filePath}". Reason: ${reason}. ` +
        'Ensure the file uses valid YAML frontmatter delimited by "---" markers and valid UTF-8 Markdown.',
      "OKF_PARSE_ERROR",
      { filePath, reason },
    );
    this.name = "OKFParseError";
  }
}
