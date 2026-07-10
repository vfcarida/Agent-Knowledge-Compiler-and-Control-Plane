/**
 * @module domain/types
 * @description Core type definitions for the Open Career Format (OCF) system.
 *
 * These types implement the OKF v0.1 specification adapted for career management.
 * The OKF spec requires only a `type` field in YAML frontmatter, but we define
 * career-specific types to provide structured, semantic classification of
 * professional data.
 *
 * ## Why these specific career types?
 *
 * The OKF specification intentionally leaves `type` values open — there is no
 * central registry. Our career-specific types were chosen to model the complete
 * lifecycle of a job seeker's professional identity:
 *
 * - **Skill** — The atomic unit of professional capability. Skills are the
 *   currency of ATS (Applicant Tracking Systems) and keyword matching.
 * - **Experience** — Work history entries that demonstrate applied skills
 *   in real-world contexts. Maps to resume "Experience" sections.
 * - **Education** — Academic credentials that validate foundational knowledge.
 * - **Certificate** — Industry certifications and licenses that provide
 *   third-party validation of expertise.
 * - **Project** — Notable projects that showcase practical application,
 *   especially valuable for portfolio-driven roles.
 * - **Preference** — Job search parameters (location, salary, remote policy)
 *   that enable intelligent job matching and filtering.
 * - **Application** — A record of a job application submission, enabling
 *   pipeline tracking (Kanban) and historical analysis.
 *
 * Each type maps to a distinct Markdown file within the OKF bundle, making
 * the entire career profile human-readable, version-controllable, and
 * interoperable with any LLM or agent that can read Markdown + YAML.
 */



// Constants and Schemas are imported and re-exported from schemas.js

export {
  OKFDocumentType,
  ApplicationStatus,
  SkillLevel,
  OKFFrontmatterSchema,
  ApplicationFrontmatterSchema,
  SkillFrontmatterSchema,
  ExperienceFrontmatterSchema,
  EducationFrontmatterSchema,
  CertificateFrontmatterSchema,
  ProjectFrontmatterSchema,
  PreferenceFrontmatterSchema,
  CareerFrontmatterSchema,
} from './schemas.js';

// ─── TypeScript Interfaces ──────────────────────────────────────────────────────

/**
 * Base OKF frontmatter fields per v0.1 spec.
 */
export interface OKFFrontmatter {
  /** REQUIRED. The kind of concept this document represents. */
  type: string;
  /** Human-readable display name. */
  title?: string;
  /** Single sentence summarizing the concept. */
  description?: string;
  /** Canonical URI for the underlying asset. */
  resource?: string;
  /** Classification tags for filtering. */
  tags?: string[];
  /** ISO 8601 last-modified timestamp. */
  timestamp?: string;
  
  // Lifecycle fields
  priority?: 'low' | 'medium' | 'high' | 'critical';
  owner?: string;
  lastReviewedAt?: string;
  reviewCadenceDays?: number;
  status?: 'active' | 'stale' | 'deprecated' | 'archived';
  successor?: string;

  /** Allow additional producer-defined fields. */
  [key: string]: unknown;
}

/**
 * A complete OKF document with parsed frontmatter, body, and metadata.
 */
export interface OKFDocument {
  /** Parsed YAML frontmatter. */
  frontmatter: OKFFrontmatter;
  /** Markdown body content (everything after the frontmatter). */
  body: string;
  /** Absolute file path on disk. */
  filePath: string;
  /**
   * Concept ID per OKF spec §2: the file path within the bundle with
   * the `.md` suffix removed. Example: `skills/typescript`.
   */
  conceptId: string;
}

/**
 * A chronological log entry for the `log.md` file.
 * Per OKF spec §3.1, `log.md` is a reserved filename for update history.
 */
export interface LogEntry {
  /** ISO 8601 timestamp of the event. */
  timestamp: string;
  /** What action was performed. */
  action: string;
  /** The concept ID that was affected. */
  conceptId: string;
  /** Optional human-readable details. */
  details?: string;
}

/**
 * Aggregated career context for LLM consumption.
 * Used by the MCP `read_career_context` tool.
 */
export interface CareerContext {
  skills: OKFDocument[];
  experiences: OKFDocument[];
  education: OKFDocument[];
  certificates: OKFDocument[];
  projects: OKFDocument[];
  preferences: OKFDocument[];
  applications: OKFDocument[];
}
