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

import { z } from 'zod';

// ─── OKF Document Types ────────────────────────────────────────────────────────

/**
 * Career-specific OKF document types.
 *
 * Per OKF v0.1 spec §4.1: "Type values are not registered centrally.
 * Producers SHOULD pick values that are descriptive and self-explanatory."
 */
export const OKFDocumentType = {
  Skill: 'Skill',
  Experience: 'Experience',
  Education: 'Education',
  Preference: 'Preference',
  Application: 'Application',
  Certificate: 'Certificate',
  Project: 'Project',
} as const;

export type OKFDocumentType = (typeof OKFDocumentType)[keyof typeof OKFDocumentType];

/**
 * Application pipeline stages for Kanban tracking.
 */
export const ApplicationStatus = {
  Saved: 'Saved',
  Applied: 'Applied',
  Screening: 'Screening',
  Interview: 'Interview',
  Offer: 'Offer',
  Rejected: 'Rejected',
  Withdrawn: 'Withdrawn',
} as const;

export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

/**
 * Skill proficiency levels for granular capability assessment.
 */
export const SkillLevel = {
  Beginner: 'Beginner',
  Intermediate: 'Intermediate',
  Advanced: 'Advanced',
  Expert: 'Expert',
} as const;

export type SkillLevel = (typeof SkillLevel)[keyof typeof SkillLevel];

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

/**
 * Base frontmatter schema per OKF v0.1 spec §4.1.
 * Only `type` is required; all other fields are recommended or optional.
 */
export const OKFFrontmatterSchema = z.object({
  type: z.string().min(1, 'The "type" field is required by OKF v0.1 spec §4.1'),
  title: z.string().optional(),
  description: z.string().optional(),
  resource: z.string().optional(),
  tags: z.array(z.string()).optional(),
  timestamp: z.string().optional(),
}).passthrough();

/**
 * Extended frontmatter for Application documents.
 */
export const ApplicationFrontmatterSchema = OKFFrontmatterSchema.extend({
  type: z.literal(OKFDocumentType.Application),
  company: z.string().optional(),
  position: z.string().optional(),
  url: z.string().url().optional(),
  platform: z.string().optional(),
  status: z.nativeEnum(ApplicationStatus).optional(),
  appliedAt: z.string().optional(),
  salary: z.string().optional(),
  location: z.string().optional(),
});

/**
 * Extended frontmatter for Skill documents.
 */
export const SkillFrontmatterSchema = OKFFrontmatterSchema.extend({
  type: z.literal(OKFDocumentType.Skill),
  level: z.nativeEnum(SkillLevel).optional(),
  yearsOfExperience: z.number().optional(),
  category: z.string().optional(),
});

/**
 * Extended frontmatter for Experience documents.
 */
export const ExperienceFrontmatterSchema = OKFFrontmatterSchema.extend({
  type: z.literal(OKFDocumentType.Experience),
  company: z.string().optional(),
  role: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
  location: z.string().optional(),
});

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
