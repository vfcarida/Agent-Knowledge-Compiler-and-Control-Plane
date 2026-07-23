import { describe, it, expect } from "vitest";
import { TokenEstimator } from "../../context/token-estimator.js";
import { RelevanceScore } from "../../context/relevance-score.js";
import { ContextPlanner } from "../../context/context-plan.js";
import type { OKFDocument } from "../../domain/types.js";

describe("Context Economics", () => {
  describe("TokenEstimator", () => {
    it("should estimate tokens deterministically", () => {
      expect(TokenEstimator.estimate("1234")).toBe(1);
      expect(TokenEstimator.estimate("12345678")).toBe(2);
      expect(TokenEstimator.estimate("")).toBe(0);
    });
  });

  describe("RelevanceScore", () => {
    const mockDoc: OKFDocument = {
      conceptId: "test-doc",
      frontmatter: {
        title: "Software Engineer Resume",
        type: "resume",
        tags: ["software", "engineering", "typescript"],
        priority: "high",
      },
      body: "This is a test body",
      filePath: "/path/to/test.md",
    };

    it("should calculate score based on task match", () => {
      const highRelevance = RelevanceScore.calculate(
        mockDoc,
        "software engineer resume",
      );
      const lowRelevance = RelevanceScore.calculate(
        mockDoc,
        "unrelated marketing task",
      );

      expect(highRelevance).toBeGreaterThan(lowRelevance);
    });

    it("should apply priority boosts", () => {
      const normalDoc = {
        ...mockDoc,
        frontmatter: { ...mockDoc.frontmatter, priority: undefined },
      };

      const normalScore = RelevanceScore.calculate(normalDoc, "software");
      const highScore = RelevanceScore.calculate(mockDoc, "software");

      expect(highScore).toBeGreaterThan(normalScore);
    });
  });

  describe("ContextPlanner", () => {
    const docs: OKFDocument[] = [
      {
        conceptId: "doc-1",
        frontmatter: {
          title: "High Priority",
          priority: "critical",
          type: "guide",
        },
        body: "Short body",
        filePath: "/1.md",
      },
      {
        conceptId: "doc-2",
        frontmatter: { title: "Low Priority", type: "note" },
        body: "A".repeat(1000), // ~250 tokens
        filePath: "/2.md",
      },
      {
        conceptId: "doc-3",
        frontmatter: { title: "Medium Priority", type: "guide" },
        body: "B".repeat(500), // ~125 tokens
        filePath: "/3.md",
      },
    ];

    it("should exclude documents that exceed the budget", () => {
      // Small budget: only doc-1 and maybe doc-3 will fit. doc-2 will definitely not fit if budget is low.
      const manifest = ContextPlanner.plan(docs, {
        task: "guide",
        budget: { maxTokens: 150 }, // 150 tokens max
        mode: "full",
      });

      // doc-2 requires ~250 tokens for its body alone, so it should be excluded
      expect(manifest.documentsExcluded.some((d) => d.id === "doc-2")).toBe(
        true,
      );
      expect(manifest.totalEstimatedTokens).toBeLessThanOrEqual(150);
    });

    it("should sort documents by relevance before applying budget", () => {
      const manifest = ContextPlanner.plan(docs, {
        task: "guide",
        budget: { maxTokens: 1000 },
        mode: "full",
      });

      // doc-1 is critical priority, so it should be first
      expect(manifest.documentsIncluded[0].id).toBe("doc-1");
    });
  });
});
