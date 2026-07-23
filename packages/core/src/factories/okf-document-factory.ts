/**
 * @module factories/okf-document-factory
 * @description Factory for creating pre-validated OKF career documents.
 *
 * The Factory Pattern centralises document creation so that every OKF document
 * produced in the system has:
 * - A valid `type` field (per OKF v0.1 spec §4.1)
 * - A deterministic `conceptId` derived from the document's identity fields
 * - An ISO 8601 `timestamp` for tracking creation time
 * - A sensible Markdown body with structured headings
 *
 * ## Why a static factory?
 *
 * OKF documents are pure data objects with no behaviour beyond what their
 * frontmatter describes. A static factory avoids unnecessary instantiation
 * overhead and keeps the API surface thin:
 *
 * ```ts
 * const doc = OKFDocumentFactory.createSkill('TypeScript', { level: 'Advanced' });
 * ```
 */

import type { OKFDocument, OKFFrontmatter } from "../domain/types.js";
import { OKFDocumentType, ApplicationStatus } from "../domain/types.js";
import type { SkillLevel } from "../domain/types.js";

// ─── Option Types ───────────────────────────────────────────────────────────────

/** Options for creating a Skill document. */
export interface CreateSkillOptions {
  level?: SkillLevel;
  yearsOfExperience?: number;
  category?: string;
  tags?: string[];
  description?: string;
}

/** Options for creating an Experience document. */
export interface CreateExperienceOptions {
  startDate?: string;
  endDate?: string;
  current?: boolean;
  location?: string;
  tags?: string[];
  description?: string;
}

/** Options for creating an Application document. */
export interface CreateApplicationOptions {
  platform?: string;
  applicationStatus?: string;
  salary?: string;
  location?: string;
  tags?: string[];
  appliedAt?: string;
}

/** Options for creating an Education document. */
export interface CreateEducationOptions {
  field?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  tags?: string[];
  description?: string;
}

/** Options for creating a Certificate document. */
export interface CreateCertificateOptions {
  dateObtained?: string;
  expirationDate?: string;
  credentialId?: string;
  url?: string;
  tags?: string[];
  description?: string;
}

/** Options for creating a Project document. */
export interface CreateProjectOptions {
  url?: string;
  technologies?: string[];
  startDate?: string;
  endDate?: string;
  tags?: string[];
  description?: string;
}

/** Options for creating a Preference document. */
export interface CreatePreferenceOptions {
  title?: string;
  locations?: string[];
  remote?: boolean;
  salaryRange?: string;
  roles?: string[];
  companySize?: string;
  tags?: string[];
  description?: string;
}

// ─── Factory ────────────────────────────────────────────────────────────────────

/**
 * Static factory for creating pre-validated {@link OKFDocument} objects.
 *
 * Each method produces a complete OKF document with:
 * - Populated frontmatter (type, title, tags, timestamp, plus type-specific fields)
 * - A structured Markdown body with headings
 * - A deterministic `conceptId` derived from the document's identity fields
 * - An empty `filePath` (to be resolved by the repository at save time)
 *
 * @example
 * ```ts
 * const skill = OKFDocumentFactory.createSkill('TypeScript', {
 *   level: 'Advanced',
 *   yearsOfExperience: 5,
 *   category: 'Programming Languages',
 * });
 * // skill.conceptId === 'skills/typescript'
 * ```
 */
export class OKFDocumentFactory {
  /**
   * Create a Skill document.
   *
   * @param name - Display name of the skill (e.g., "TypeScript")
   * @param options - Optional skill-specific fields
   * @returns A complete OKF document with type `Skill`
   */
  static createSkill(
    name: string,
    options: CreateSkillOptions = {},
  ): OKFDocument {
    const frontmatter: OKFFrontmatter = {
      type: OKFDocumentType.Skill,
      title: name,
      timestamp: new Date().toISOString(),
      ...(options.level !== undefined && { level: options.level }),
      ...(options.yearsOfExperience !== undefined && {
        yearsOfExperience: options.yearsOfExperience,
      }),
      ...(options.category !== undefined && { category: options.category }),
      ...(options.tags !== undefined && { tags: options.tags }),
      ...(options.description !== undefined && {
        description: options.description,
      }),
    };

    const body = [
      `# ${name}`,
      "",
      options.description ?? `Skill profile for ${name}.`,
    ].join("\n");

    return {
      frontmatter,
      body,
      filePath: "",
      conceptId: `skills/${OKFDocumentFactory.slugify(name)}`,
    };
  }

  /**
   * Create an Experience document.
   *
   * @param company - Company or organisation name
   * @param role - Job title or role
   * @param options - Optional experience-specific fields
   * @returns A complete OKF document with type `Experience`
   */
  static createExperience(
    company: string,
    role: string,
    options: CreateExperienceOptions = {},
  ): OKFDocument {
    const frontmatter: OKFFrontmatter = {
      type: OKFDocumentType.Experience,
      title: `${role} at ${company}`,
      company,
      role,
      timestamp: new Date().toISOString(),
      ...(options.startDate !== undefined && { startDate: options.startDate }),
      ...(options.endDate !== undefined && { endDate: options.endDate }),
      ...(options.current !== undefined && { current: options.current }),
      ...(options.location !== undefined && { location: options.location }),
      ...(options.tags !== undefined && { tags: options.tags }),
      ...(options.description !== undefined && {
        description: options.description,
      }),
    };

    const body = [
      `# ${role} at ${company}`,
      "",
      options.description ?? `Experience as ${role} at ${company}.`,
    ].join("\n");

    return {
      frontmatter,
      body,
      filePath: "",
      conceptId: `experiences/${OKFDocumentFactory.slugify(`${company} ${role}`)}`,
    };
  }

  /**
   * Create an Application document.
   *
   * Defaults `status` to `'Applied'` when not provided.
   *
   * @param company - Company name
   * @param position - Position title
   * @param url - Job listing URL
   * @param options - Optional application-specific fields
   * @returns A complete OKF document with type `Application`
   */
  static createApplication(
    company: string,
    position: string,
    url: string,
    options: CreateApplicationOptions = {},
  ): OKFDocument {
    const datePrefix = new Date().toISOString().slice(0, 10);

    const frontmatter: OKFFrontmatter = {
      type: OKFDocumentType.Application,
      title: `${position} at ${company}`,
      company,
      position,
      url,
      applicationStatus: options.applicationStatus ?? ApplicationStatus.Applied,
      timestamp: new Date().toISOString(),
      ...(options.platform !== undefined && { platform: options.platform }),
      ...(options.salary !== undefined && { salary: options.salary }),
      ...(options.location !== undefined && { location: options.location }),
      ...(options.tags !== undefined && { tags: options.tags }),
      ...(options.appliedAt !== undefined && { appliedAt: options.appliedAt }),
    };

    const body = [
      `# ${position} at ${company}`,
      "",
      `Application submitted via [${url}](${url}).`,
    ].join("\n");

    return {
      frontmatter,
      body,
      filePath: "",
      conceptId: `applications/${datePrefix}-${OKFDocumentFactory.slugify(company)}`,
    };
  }

  /**
   * Create an Education document.
   *
   * @param institution - Name of the educational institution
   * @param degree - Degree or programme name
   * @param options - Optional education-specific fields
   * @returns A complete OKF document with type `Education`
   */
  static createEducation(
    institution: string,
    degree: string,
    options: CreateEducationOptions = {},
  ): OKFDocument {
    const frontmatter: OKFFrontmatter = {
      type: OKFDocumentType.Education,
      title: `${degree} — ${institution}`,
      institution,
      degree,
      timestamp: new Date().toISOString(),
      ...(options.field !== undefined && { field: options.field }),
      ...(options.startDate !== undefined && { startDate: options.startDate }),
      ...(options.endDate !== undefined && { endDate: options.endDate }),
      ...(options.location !== undefined && { location: options.location }),
      ...(options.tags !== undefined && { tags: options.tags }),
      ...(options.description !== undefined && {
        description: options.description,
      }),
    };

    const body = [
      `# ${degree} — ${institution}`,
      "",
      options.description ?? `${degree} at ${institution}.`,
    ].join("\n");

    return {
      frontmatter,
      body,
      filePath: "",
      conceptId: `education/${OKFDocumentFactory.slugify(institution)}`,
    };
  }

  /**
   * Create a Certificate document.
   *
   * @param name - Certificate name
   * @param issuer - Issuing organisation
   * @param options - Optional certificate-specific fields
   * @returns A complete OKF document with type `Certificate`
   */
  static createCertificate(
    name: string,
    issuer: string,
    options: CreateCertificateOptions = {},
  ): OKFDocument {
    const frontmatter: OKFFrontmatter = {
      type: OKFDocumentType.Certificate,
      title: name,
      issuer,
      timestamp: new Date().toISOString(),
      ...(options.dateObtained !== undefined && {
        dateObtained: options.dateObtained,
      }),
      ...(options.expirationDate !== undefined && {
        expirationDate: options.expirationDate,
      }),
      ...(options.credentialId !== undefined && {
        credentialId: options.credentialId,
      }),
      ...(options.url !== undefined && { url: options.url }),
      ...(options.tags !== undefined && { tags: options.tags }),
      ...(options.description !== undefined && {
        description: options.description,
      }),
    };

    const body = [
      `# ${name}`,
      "",
      `Issued by ${issuer}.`,
      ...(options.credentialId
        ? [`Credential ID: ${options.credentialId}`]
        : []),
    ].join("\n");

    return {
      frontmatter,
      body,
      filePath: "",
      conceptId: `certificates/${OKFDocumentFactory.slugify(name)}`,
    };
  }

  /**
   * Create a Project document.
   *
   * @param name - Project name
   * @param options - Optional project-specific fields
   * @returns A complete OKF document with type `Project`
   */
  static createProject(
    name: string,
    options: CreateProjectOptions = {},
  ): OKFDocument {
    const frontmatter: OKFFrontmatter = {
      type: OKFDocumentType.Project,
      title: name,
      timestamp: new Date().toISOString(),
      ...(options.url !== undefined && { url: options.url }),
      ...(options.technologies !== undefined && {
        technologies: options.technologies,
      }),
      ...(options.startDate !== undefined && { startDate: options.startDate }),
      ...(options.endDate !== undefined && { endDate: options.endDate }),
      ...(options.tags !== undefined && { tags: options.tags }),
      ...(options.description !== undefined && {
        description: options.description,
      }),
    };

    const body = [
      `# ${name}`,
      "",
      options.description ?? `Overview of the ${name} project.`,
    ].join("\n");

    return {
      frontmatter,
      body,
      filePath: "",
      conceptId: `projects/${OKFDocumentFactory.slugify(name)}`,
    };
  }

  /**
   * Create a Preference document.
   *
   * @param options - Job search preference fields
   * @returns A complete OKF document with type `Preference`
   */
  static createPreference(options: CreatePreferenceOptions = {}): OKFDocument {
    const frontmatter: OKFFrontmatter = {
      type: OKFDocumentType.Preference,
      title: options.title ?? "Job Search Preferences",
      timestamp: new Date().toISOString(),
      ...(options.locations !== undefined && { locations: options.locations }),
      ...(options.remote !== undefined && { remote: options.remote }),
      ...(options.salaryRange !== undefined && {
        salaryRange: options.salaryRange,
      }),
      ...(options.roles !== undefined && { roles: options.roles }),
      ...(options.companySize !== undefined && {
        companySize: options.companySize,
      }),
      ...(options.tags !== undefined && { tags: options.tags }),
      ...(options.description !== undefined && {
        description: options.description,
      }),
    };

    const body = [
      `# ${options.title ?? "Job Search Preferences"}`,
      "",
      options.description ?? "Current job search parameters and preferences.",
    ].join("\n");

    return {
      frontmatter,
      body,
      filePath: "",
      conceptId: "preferences/job-search",
    };
  }

  /**
   * Convert a human-readable string into a URL-safe slug.
   *
   * Transforms to lowercase, replaces spaces and special characters with
   * hyphens, and removes consecutive hyphens.
   *
   * @param text - The text to slugify
   * @returns A lowercase, hyphenated slug
   *
   * @example
   * ```ts
   * OKFDocumentFactory['slugify']('Hello World!') // => 'hello-world'
   * OKFDocumentFactory['slugify']('C++ Programming') // => 'c-programming'
   * ```
   */
  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
}
