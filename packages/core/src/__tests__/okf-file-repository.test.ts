/**
 * @module __tests__/okf-file-repository.test
 * @description Unit tests for OKFFileRepository with mocked IFileSystemAdapter.
 *
 * Uses a REAL FrontmatterParser (pure, no I/O) and a vi.fn()-based mock for
 * IFileSystemAdapter. This approach validates the integration between the
 * repository's orchestration logic and the parser's validation, while keeping
 * the tests deterministic and fast (no filesystem access).
 *
 * Mock data uses realistic career document content to ensure frontmatter
 * schemas are exercised end-to-end.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import type { IFileSystemAdapter } from "../domain/interfaces.js";
import { OKFValidationError, OKFFileNotFoundError } from "../domain/errors.js";
import { FrontmatterParser } from "../infrastructure/frontmatter-parser.js";
import { OKFFileRepository } from "../repositories/okf-file-repository.js";

// ─── Fixtures ───────────────────────────────────────────────────────────────────

const BUNDLE_ROOT = "/home/user/career-bundle";

/** A valid Skill document. */
const SKILL_CONTENT = [
  "---",
  "type: Skill",
  "title: TypeScript",
  "level: Advanced",
  "yearsOfExperience: 5",
  "category: Programming Languages",
  "tags:",
  "  - frontend",
  "  - backend",
  "---",
  "",
  "# TypeScript",
  "",
  "Expert-level TypeScript developer with 5 years of production experience.",
].join("\n");

/** A valid Experience document. */
const EXPERIENCE_CONTENT = [
  "---",
  "type: Experience",
  "title: Senior Engineer at Acme Corp",
  "company: Acme Corp",
  "role: Senior Engineer",
  'startDate: "2021-03-01"',
  'endDate: "2024-06-30"',
  "location: San Francisco, CA",
  "tags:",
  "  - full-time",
  "---",
  "",
  "# Senior Engineer at Acme Corp",
  "",
  "Led a team of 8 engineers building distributed systems.",
].join("\n");

/** A valid Application document. */
const APPLICATION_CONTENT = [
  "---",
  "type: Application",
  "title: Staff Engineer at BigTech",
  "company: BigTech",
  "position: Staff Engineer",
  "url: https://careers.bigtech.com/12345",
  "applicationStatus: Applied",
  "platform: LinkedIn",
  "---",
  "",
  "# Staff Engineer at BigTech",
  "",
  "Applied for the Staff Engineer role via LinkedIn.",
].join("\n");

/** Content with invalid/missing type field. */
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
const INVALID_CONTENT = [
  "---",
  "title: Missing Type",
  "---",
  "",
  "This document has no type field.",
].join("\n");

/** Content with malformed YAML. */
const MALFORMED_CONTENT = [
  "---",
  "type: Skill",
  "bad: [unclosed",
  "---",
  "",
  "Body.",
].join("\n");

// ─── Mock Factory ───────────────────────────────────────────────────────────────

function createMockFileSystemAdapter(): IFileSystemAdapter {
  return {
    // eslint-disable-next-line no-unused-vars
    readFile: vi.fn<(filePath: string) => Promise<string>>(),
    writeFile: vi
      // eslint-disable-next-line no-unused-vars
      .fn<(filePath: string, content: string) => Promise<void>>()
      .mockResolvedValue(undefined),
    // eslint-disable-next-line no-unused-vars
    exists: vi.fn<(filePath: string) => Promise<boolean>>(),
    mkdir: vi
      // eslint-disable-next-line no-unused-vars
      .fn<(dirPath: string) => Promise<void>>()
      .mockResolvedValue(undefined),
    deleteFile: vi
      // eslint-disable-next-line no-unused-vars
      .fn<(filePath: string) => Promise<void>>()
      .mockResolvedValue(undefined),
    listFiles:
      // eslint-disable-next-line no-unused-vars
      vi.fn<(dirPath: string, pattern?: string) => Promise<string[]>>(),
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe("OKFFileRepository", () => {
  let mockFs: ReturnType<typeof createMockFileSystemAdapter>;
  let parser: FrontmatterParser;
  let repository: OKFFileRepository;

  beforeEach(() => {
    mockFs = createMockFileSystemAdapter();
    parser = new FrontmatterParser();
    repository = new OKFFileRepository(mockFs, parser, BUNDLE_ROOT);
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  it("should find document by concept ID", async () => {
    vi.mocked(mockFs.exists).mockResolvedValue(true);
    vi.mocked(mockFs.readFile).mockResolvedValue(SKILL_CONTENT);

    const doc = await repository.findById("skills/typescript");

    expect(doc).not.toBeNull();
    expect(doc!.frontmatter.type).toBe("Skill");
    expect(doc!.frontmatter.title).toBe("TypeScript");
    expect(doc!.conceptId).toBe("skills/typescript");
    expect(mockFs.readFile).toHaveBeenCalledWith(
      expect.stringContaining("skills"),
    );
  });

  it("should return null for non-existent concept ID", async () => {
    vi.mocked(mockFs.exists).mockResolvedValue(false);

    const doc = await repository.findById("skills/nonexistent");

    expect(doc).toBeNull();
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  it("should find all documents excluding reserved files", async () => {
    vi.mocked(mockFs.listFiles).mockResolvedValue([
      "skills/typescript.md",
      "experiences/acme-corp.md",
      "index.md",
      "log.md",
    ]);
    vi.mocked(mockFs.readFile)
      .mockResolvedValueOnce(SKILL_CONTENT)
      .mockResolvedValueOnce(EXPERIENCE_CONTENT);

    const docs = await repository.findAll();

    // index.md and log.md should be excluded
    expect(docs).toHaveLength(2);
    expect(docs[0].frontmatter.type).toBe("Skill");
    expect(docs[1].frontmatter.type).toBe("Experience");
  });

  // ─── findByType ───────────────────────────────────────────────────────────

  it("should find documents by type", async () => {
    vi.mocked(mockFs.listFiles).mockResolvedValue([
      "skills/typescript.md",
      "experiences/acme-corp.md",
      "applications/bigtech.md",
    ]);
    vi.mocked(mockFs.readFile)
      .mockResolvedValueOnce(SKILL_CONTENT)
      .mockResolvedValueOnce(EXPERIENCE_CONTENT)
      .mockResolvedValueOnce(APPLICATION_CONTENT);

    const docs = await repository.findByType("Experience");

    expect(docs).toHaveLength(1);
    expect(docs[0].frontmatter.type).toBe("Experience");
    expect(docs[0].frontmatter["company"]).toBe("Acme Corp");
  });

  // ─── save ─────────────────────────────────────────────────────────────────

  it("should save document with valid frontmatter", async () => {
    const doc = {
      frontmatter: {
        type: "Skill",
        title: "Python",
        tags: ["backend", "data-science"],
      },
      body: "# Python\n\nVersatile programming language.",
      filePath: "",
      conceptId: "skills/python",
    };

    await repository.save(doc);

    expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
    const [writtenPath, writtenContent] = vi.mocked(mockFs.writeFile).mock
      .calls[0];
    expect(writtenPath).toContain("skills");
    expect(writtenPath).toContain("python.md");
    expect(writtenContent).toContain("type: Skill");
    expect(writtenContent).toContain("title: Python");
    expect(writtenContent).toContain("# Python");
  });

  it("should throw OKFValidationError when saving document without type", async () => {
    const doc = {
      frontmatter: {
        type: "",
        title: "Invalid",
      },
      body: "No type field.",
      filePath: "",
      conceptId: "bad/invalid",
    };

    await expect(repository.save(doc)).rejects.toThrow(OKFValidationError);
    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  it("should delete existing document", async () => {
    vi.mocked(mockFs.exists).mockResolvedValue(true);

    await repository.delete("skills/typescript");

    expect(mockFs.deleteFile).toHaveBeenCalledTimes(1);
    expect(mockFs.deleteFile).toHaveBeenCalledWith(
      expect.stringContaining("typescript.md"),
    );
  });

  it("should throw OKFFileNotFoundError when deleting non-existent document", async () => {
    vi.mocked(mockFs.exists).mockResolvedValue(false);

    await expect(repository.delete("skills/ghost")).rejects.toThrow(
      OKFFileNotFoundError,
    );
    expect(mockFs.deleteFile).not.toHaveBeenCalled();
  });

  // ─── Error Handling ───────────────────────────────────────────────────────

  it("should handle parse errors gracefully in findAll", async () => {
    vi.mocked(mockFs.listFiles).mockResolvedValue([
      "skills/typescript.md",
      "skills/broken.md",
    ]);
    vi.mocked(mockFs.readFile)
      .mockResolvedValueOnce(SKILL_CONTENT)
      .mockResolvedValueOnce(MALFORMED_CONTENT);

    // findAll should skip unparseable documents rather than throwing
    const docs = await repository.findAll();

    expect(docs).toHaveLength(1);
    expect(docs[0].frontmatter.type).toBe("Skill");
  });
});
