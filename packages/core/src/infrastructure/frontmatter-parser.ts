/**
 * @module infrastructure/frontmatter-parser
 * @description Parses and serializes OKF documents (Markdown + YAML frontmatter).
 *
 * Uses `gray-matter` for the actual parsing and `zod` for runtime validation
 * of the required `type` field per OKF v0.1 spec §4.1.
 */

import matter from "gray-matter";
import path from "node:path";

import { OKFParseError, OKFValidationError } from "../domain/errors.js";
import type { IFrontmatterParser } from "../domain/interfaces.js";
import type { OKFDocument, OKFFrontmatter } from "../domain/types.js";
import { OKFFrontmatterSchema } from "../domain/types.js";

/**
 * Implements the {@link IFrontmatterParser} interface using `gray-matter`.
 */
export class FrontmatterParser implements IFrontmatterParser {
  /**
   * Parse a raw Markdown string into an {@link OKFDocument}.
   *
   * @param rawContent - The full file content including YAML frontmatter
   * @param filePath - Absolute path to the file (for error messages and conceptId derivation)
   * @param bundleRoot - Absolute path to the OKF bundle root directory
   * @returns A parsed and validated OKF document
   *
   * @throws {OKFParseError} When YAML frontmatter is malformed
   * @throws {OKFValidationError} When the required `type` field is missing
   */
  parse(rawContent: string, filePath: string, bundleRoot: string): OKFDocument {
    let parsed: matter.GrayMatterFile<string>;

    try {
      parsed = matter(rawContent);
    } catch (error: unknown) {
      const reason =
        error instanceof Error ? error.message : "Unknown parsing error";
      throw new OKFParseError(filePath, reason);
    }

    // Validate frontmatter against OKF schema
    const validation = OKFFrontmatterSchema.safeParse(parsed.data);

    if (!validation.success) {
      const issues = validation.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");

      throw new OKFValidationError(`Frontmatter validation failed: ${issues}`, {
        filePath,
        issues: validation.error.issues,
      });
    }

    // Derive concept ID: relative path from bundle root, without .md extension
    const relativePath = path.relative(bundleRoot, filePath);
    const conceptId = relativePath
      .replace(/\\/g, "/") // Normalize Windows paths
      .replace(/\.md$/, "");

    return {
      frontmatter: validation.data as OKFFrontmatter,
      body: parsed.content.trim(),
      filePath,
      conceptId,
    };
  }

  /**
   * Serialize frontmatter and body back into a Markdown string.
   *
   * @param frontmatter - The YAML frontmatter object
   * @param body - The Markdown body content
   * @returns A complete Markdown string with YAML frontmatter delimiters
   */
  serialize(frontmatter: OKFFrontmatter, body: string): string {
    return matter.stringify(body, frontmatter);
  }
}
