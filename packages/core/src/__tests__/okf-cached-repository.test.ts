import { describe, it, expect, vi } from "vitest";
import { OKFCachedRepository } from "../repositories/okf-cached-repository.js";
import { IOKFRepository } from "../domain/interfaces.js";
import { AgentKnowledgeIR } from "../ir/types.js";
import { OKFDocument } from "../domain/types.js";

describe("OKFCachedRepository", () => {
  const mockBaseRepository: IOKFRepository = {
    findById: vi.fn(),
    findByType: vi.fn(),
    findAll: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  };

  const sampleIR: AgentKnowledgeIR = {
    irVersion: "1.0.0",
    okfVersion: "0.1.0",
    bundleId: "test-bundle",
    buildId: "test-build",
    timestamp: "2026-07-08T00:00:00Z",
    concepts: [
      {
        conceptId: "skills/react",
        type: "Skill",
        source: { filePath: "/bundle/skills/react.md", format: "okf/markdown" },
        frontmatter: { type: "Skill", title: "React" },
        body: "React experience",
        budget: { byteSize: 10, estimatedTokens: 3 },
      },
      {
        conceptId: "experiences/acme",
        type: "Experience",
        source: {
          filePath: "/bundle/experiences/acme.md",
          format: "okf/markdown",
        },
        frontmatter: { type: "Experience", title: "Acme Corp" },
        body: "Worked at Acme",
        budget: { byteSize: 10, estimatedTokens: 3 },
      },
    ],
  };

  it("should initialize cache from IR and serve findById from memory", async () => {
    const repo = new OKFCachedRepository(mockBaseRepository, sampleIR);

    const doc = await repo.findById("skills/react");
    expect(doc).toBeDefined();
    expect(doc?.frontmatter.title).toBe("React");
    expect(mockBaseRepository.findById).not.toHaveBeenCalled();
  });

  it("should serve findByType from memory", async () => {
    const repo = new OKFCachedRepository(mockBaseRepository, sampleIR);

    const docs = await repo.findByType("Experience");
    expect(docs).toHaveLength(1);
    expect(docs[0].conceptId).toBe("experiences/acme");
    expect(mockBaseRepository.findByType).not.toHaveBeenCalled();
  });

  it("should serve findAll from memory", async () => {
    const repo = new OKFCachedRepository(mockBaseRepository, sampleIR);

    const docs = await repo.findAll();
    expect(docs).toHaveLength(2);
    expect(mockBaseRepository.findAll).not.toHaveBeenCalled();
  });

  it("should write to base repository and update cache on save", async () => {
    const repo = new OKFCachedRepository(mockBaseRepository, sampleIR);

    const newDoc: OKFDocument = {
      conceptId: "skills/vue",
      filePath: "/bundle/skills/vue.md",
      frontmatter: { type: "Skill", title: "Vue" },
      body: "Vue experience",
    };

    await repo.save(newDoc);
    expect(mockBaseRepository.save).toHaveBeenCalledWith(newDoc);

    const doc = await repo.findById("skills/vue");
    expect(doc).toBeDefined();
    expect(doc?.frontmatter.title).toBe("Vue");
  });

  it("should delete from base repository and update cache on delete", async () => {
    const repo = new OKFCachedRepository(mockBaseRepository, sampleIR);

    await repo.delete("skills/react");
    expect(mockBaseRepository.delete).toHaveBeenCalledWith("skills/react");

    const doc = await repo.findById("skills/react");
    expect(doc).toBeNull();
  });
});
