import { describe, expect, it, vi } from "vitest";
import { migrateBundle } from "../migrations/migrate-bundle.js";
import type {
  IFileSystemAdapter,
  IFrontmatterParser,
} from "../domain/interfaces.js";
import path from "node:path";

describe("migrateBundle", () => {
  it("identifies legacy files and updates them in-place when write is true", async () => {
    // Mock FileSystemAdapter
    const mockFiles = [
      "skills/typescript.md",
      "experiences/senior.md",
      "log.md",
    ];
    const mockFs: IFileSystemAdapter = {
      exists: vi.fn().mockResolvedValue(true),
      listFiles: vi.fn().mockResolvedValue(mockFiles),
      readFile: vi.fn().mockImplementation(async (p: string) => {
        if (p.endsWith("typescript.md")) {
          return "---\ntype: Skill\ntitle: TS\n---\nBody content";
        }
        if (p.endsWith("senior.md")) {
          return "---\ntype: Experience\nschemaVersion: akcp.profile/v1\n---\nBody senior";
        }
        return "";
      }),
      writeFile: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn().mockResolvedValue(undefined),
    };

    // Mock Parser
    const mockParser: IFrontmatterParser = {
      parse: vi.fn().mockImplementation((raw: string, file: string) => {
        if (file.endsWith("typescript.md")) {
          return {
            frontmatter: { type: "Skill", title: "TS" },
            body: "Body content",
            filePath: file,
            conceptId: "skills/typescript",
          };
        }
        return {
          frontmatter: { type: "Experience", schemaVersion: "akcp.profile/v1" },
          body: "Body senior",
          filePath: file,
          conceptId: "experiences/senior",
        };
      }),
      serialize: vi.fn().mockReturnValue("Serialized output"),
    };

    const report = await migrateBundle(mockFs, mockParser, "/okf", {
      write: true,
    });

    expect(report.success).toBe(true);
    expect(report.filesChecked).toBe(2); // typescript and senior
    expect(report.filesNeedingMigration).toBe(1); // typescript lacks schemaVersion
    expect(report.filesMigrated).toBe(1);
    expect(report.migratedFiles).toContain("skills/typescript");
    expect(mockFs.writeFile).toHaveBeenCalled();
  });

  const createMockFs = () => ({
    exists: vi.fn(),
    listFiles: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    deleteFile: vi.fn(),
  });

  const createMockParser = () => ({
    parse: vi.fn().mockReturnValue({
      frontmatter: {},
      body: "",
      filePath: "",
      conceptId: "",
    }),
    serialize: vi.fn().mockReturnValue(""),
  });

  it("should return an error if bundle root does not exist", async () => {
    const mockFs = createMockFs();
    mockFs.exists.mockResolvedValue(false);
    const mockParser = createMockParser();
    const report = await migrateBundle(mockFs, mockParser, "/invalid");
    expect(report.success).toBe(false);
    expect(report.error).toContain("Bundle root directory does not exist");
  });

  it("should create a backup if backup and write options are true", async () => {
    const mockFs = createMockFs();
    mockFs.exists.mockResolvedValue(true);
    mockFs.listFiles.mockResolvedValue(["file1.md"]);
    mockFs.readFile.mockResolvedValue("---\ntitle: test\n---");
    const mockParser = createMockParser();

    const report = await migrateBundle(mockFs, mockParser, "/test", {
      write: true,
      backup: true,
    });

    expect(report.backupPath).toBe("/test-backup");
    expect(mockFs.mkdir).toHaveBeenCalledWith("/test-backup");
    expect(mockFs.writeFile).toHaveBeenCalled();
  });

  it("should handle parse errors gracefully", async () => {
    const mockFs = createMockFs();
    mockFs.exists.mockResolvedValue(true);
    mockFs.listFiles.mockResolvedValue(["corrupt.md"]);
    mockFs.readFile.mockResolvedValue("invalid yaml");
    const mockParser = createMockParser();
    mockParser.parse.mockImplementation(() => {
      throw new Error("Parse error");
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const report = await migrateBundle(mockFs, mockParser, "/test", {
      write: true,
    });

    expect(report.filesChecked).toBe(1);
    expect(report.filesMigrated).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Skipping corrupt file"),
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("should update an existing log.md if it exists", async () => {
    const mockFs = createMockFs();
    mockFs.exists.mockImplementation(async () => true);
    mockFs.listFiles.mockResolvedValue(["doc.md"]);
    mockFs.readFile.mockImplementation(async (p: string) => {
      if (p.endsWith("doc.md")) return "---\ntitle: doc\n---";
      if (p.endsWith("log.md"))
        return "---\ntype: Log\n---\n\n| Timestamp | Action | Concept | Details |\n|---|---|---|---|\n| old | old | old | old |";
      return "";
    });
    const mockParser = createMockParser();

    const report = await migrateBundle(mockFs, mockParser, "/test", {
      write: true,
    });

    expect(report.filesMigrated).toBe(1);
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("log.md"),
      expect.stringContaining("MIGRATED | bundle | Migrated 1 files"),
    );
  });

  it("should create a fallback log structure if log format is unexpected", async () => {
    const mockFs = createMockFs();
    mockFs.exists.mockImplementation(async () => true);
    mockFs.listFiles.mockResolvedValue(["doc.md"]);
    mockFs.readFile.mockImplementation(async (p: string) => {
      if (p.endsWith("doc.md")) return "---\ntitle: doc\n---";
      if (p.endsWith("log.md")) return "Unexpected log format without table.";
      return "";
    });
    const mockParser = createMockParser();

    const report = await migrateBundle(mockFs, mockParser, "/test", {
      write: true,
    });

    expect(report.filesMigrated).toBe(1);
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("log.md"),
      expect.stringMatching(
        /Unexpected log format without table\.\r?\n\| .* \| MIGRATED \| bundle \| Migrated 1 files/,
      ),
    );
  });

  it("should trap non-Error exceptions in try catch", async () => {
    const mockFs = createMockFs();
    mockFs.exists.mockImplementation(() => {
      throw "String error";
    });
    const mockParser = createMockParser();
    const report = await migrateBundle(mockFs, mockParser, "/test");
    expect(report.success).toBe(false);
    expect(report.error).toBe("String error");
  });
});
