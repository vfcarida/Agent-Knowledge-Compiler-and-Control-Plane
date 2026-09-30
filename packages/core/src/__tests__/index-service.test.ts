import { describe, it, expect, vi, beforeEach } from "vitest";

import type {
  IFileSystemAdapter,
  IFrontmatterParser,
} from "../domain/interfaces.js";
import type { OKFDocument } from "../domain/types.js";
import { IndexService } from "../services/index-service.js";

describe("IndexService", () => {
  let mockFs: {
    [K in keyof IFileSystemAdapter]: ReturnType<typeof vi.fn>;
  };
  let mockParser: {
    [K in keyof IFrontmatterParser]: ReturnType<typeof vi.fn>;
  };
  let service: IndexService;
  const bundleRoot = "/bundle";

  const makeDocument = (overrides: Partial<OKFDocument> = {}): OKFDocument => ({
    frontmatter: {
      type: "Skill",
      title: "TypeScript",
      description: "Typed JS",
    },
    body: "Some body",
    filePath: "/bundle/skills/typescript.md",
    conceptId: "skills/typescript",
    ...overrides,
  });

  beforeEach(() => {
    mockFs = {
      readFile: vi.fn(),
      writeFile: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn().mockResolvedValue(true),
      mkdir: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      listFiles: vi.fn().mockResolvedValue([]),
    };

    mockParser = {
      parse: vi.fn(),
      serialize: vi.fn(),
    };

    service = new IndexService(mockFs, mockParser, bundleRoot);
  });

  it("should generate index.md with document listing table", async () => {
    const doc = makeDocument();
    mockFs.listFiles.mockResolvedValue(["typescript.md"]);
    mockFs.readFile.mockResolvedValue(
      "---\ntype: Skill\ntitle: TypeScript\ndescription: Typed JS\n---\nBody",
    );
    mockParser.parse.mockReturnValue(doc);

    const result = await service.generate("/bundle/skills");

    expect(result).toContain("|");
    expect(result).toContain("TypeScript");
  });

  it("should exclude reserved files (index.md, log.md) from listing", async () => {
    mockFs.listFiles.mockResolvedValue(["index.md", "log.md", "typescript.md"]);
    mockFs.readFile.mockResolvedValue(
      "---\ntype: Skill\ntitle: TypeScript\ndescription: Typed JS\n---\nBody",
    );
    mockParser.parse.mockReturnValue(makeDocument());

    const result = await service.generate("/bundle/skills");

    // parse should only be called once (for typescript.md), not for index.md or log.md
    expect(mockParser.parse).toHaveBeenCalledTimes(1);
  });

  it("should handle empty directory", async () => {
    mockFs.listFiles.mockResolvedValue([]);

    const result = await service.generate("/bundle/skills");

    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  it("should include title, type, and description columns", async () => {
    const doc = makeDocument({
      frontmatter: {
        type: "Skill",
        title: "React",
        description: "UI library",
      },
    });
    mockFs.listFiles.mockResolvedValue(["react.md"]);
    mockFs.readFile.mockResolvedValue(
      "---\ntype: Skill\ntitle: React\ndescription: UI library\n---\nBody",
    );
    mockParser.parse.mockReturnValue(doc);

    const result = await service.generate("/bundle/skills");

    expect(result).toContain("Title");
    expect(result).toContain("Type");
    expect(result).toContain("Description");
    expect(result).toContain("React");
    expect(result).toContain("Skill");
    expect(result).toContain("UI library");
  });

  it("should write the generated index to disk", async () => {
    mockFs.listFiles.mockResolvedValue(["typescript.md"]);
    mockFs.readFile.mockResolvedValue(
      "---\ntype: Skill\ntitle: TypeScript\ndescription: Typed JS\n---\nBody",
    );
    mockParser.parse.mockReturnValue(makeDocument());

    await service.generate("/bundle/skills");

    expect(mockFs.writeFile).toHaveBeenCalled();
    const [writePath, content] = mockFs.writeFile.mock.calls[0];
    expect(writePath).toContain("index.md");
    expect(content).toContain("TypeScript");
  });
});
