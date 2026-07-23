import { describe, it, expect } from "vitest";
import { ContextPacker } from "@akcp/core";
import type { OKFDocument } from "@akcp/core";

describe("ContextPacker", () => {
  const packer = new ContextPacker();

  const mockDocs: OKFDocument[] = [
    {
      conceptId: "skill-1",
      filePath: "/skills/skill-1.md",
      frontmatter: { type: "Skill", title: "TypeScript" },
      body: "TypeScript is a strongly typed programming language that builds on JavaScript.",
    },
    {
      conceptId: "exp-1",
      filePath: "/experiences/exp-1.md",
      frontmatter: { type: "Experience", title: "Senior Developer" },
      body: "A".repeat(2000), // ~500 tokens
    },
    {
      conceptId: "exp-2",
      filePath: "/experiences/exp-2.md",
      frontmatter: { type: "Experience", title: "Irrelevant Job" },
      body: "B".repeat(100),
    },
  ];

  it("minimal mode drops body and only returns frontmatter", () => {
    const result = packer.pack(mockDocs, {
      task: "Find typescript experience",
      profile: "career",
      mode: "minimal",
      maxTokens: 500,
      includeProvenance: true,
    });

    expect(result.documents.length).toBe(3);
    for (const doc of result.documents) {
      expect(doc.excerpt).not.toContain("strongly typed programming language");
      expect(doc.excerpt).not.toContain("A".repeat(2000));
    }
    expect(result.totalEstimatedTokens).toBeLessThan(100);
  });

  it("balanced mode truncates long bodies", () => {
    const result = packer.pack(mockDocs, {
      task: "Find typescript experience",
      profile: "career",
      mode: "balanced",
      maxTokens: 1000,
      includeProvenance: true,
    });

    expect(result.documents.length).toBe(3);
    const longDoc = result.documents.find((d) => d.id === "exp-1");
    expect(longDoc?.excerpt).toContain("[TRUNCATED]");
    expect(longDoc?.excerpt.length).toBeLessThan(2000);
  });

  it("enforces maxTokens budget by omitting documents", () => {
    const result = packer.pack(mockDocs, {
      task: "Find typescript experience",
      profile: "career",
      mode: "full",
      maxTokens: 200, // Very small budget
      includeProvenance: true,
    });

    // exp-1 is ~500 tokens, so it MUST be omitted in 'full' mode with 200 budget.
    expect(result.omitted.length).toBeGreaterThan(0);
    const omittedExp1 = result.omitted.find((o) => o.id === "exp-1");
    expect(omittedExp1).toBeDefined();
    expect(omittedExp1?.reason).toContain("Budget Exceeded");
  });

  it("audit mode bypasses token limits", () => {
    const result = packer.pack(mockDocs, {
      task: "Find typescript experience",
      profile: "career",
      mode: "audit",
      maxTokens: 10, // Unrealistically low limit
      includeProvenance: true,
    });

    // In audit mode, everything is processed, but budget enforcement still excludes them if it's too low
    expect(result.omitted.length).toBe(3);
    expect(result.documents.length).toBe(0);
  });
});
