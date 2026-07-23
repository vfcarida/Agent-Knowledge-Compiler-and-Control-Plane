import { describe, it, expect } from "vitest";
import { AgentKnowledgeIRSchema } from "../../ir/schema.js";

describe("Agent Knowledge IR Schema", () => {
  it("should parse valid IR and preserve unknown fields at root", () => {
    const raw = {
      irVersion: "1.0.0",
      okfVersion: "0.1.0",
      bundleId: "test-bundle",
      buildId: "test-build",
      timestamp: "2026-07-08T00:00:00Z",
      concepts: [],
      unknownRootField: "preserved",
    };

    const parsed = AgentKnowledgeIRSchema.parse(raw);
    expect(parsed.irVersion).toBe("1.0.0");
    expect(parsed.unknownRootField).toBe("preserved");
  });

  it("should preserve unknown fields inside policies", () => {
    const raw = {
      irVersion: "1.0.0",
      okfVersion: "0.1.0",
      bundleId: "test-bundle",
      buildId: "test-build",
      timestamp: "2026-07-08T00:00:00Z",
      concepts: [],
      policies: {
        defaultAutonomyLevel: "advise",
        customEnterprisePolicy: "strict",
      },
    };

    const parsed = AgentKnowledgeIRSchema.parse(raw);
    expect(parsed.policies?.customEnterprisePolicy).toBe("strict");
  });

  it("should preserve unknown keys inside concept frontmatter", () => {
    const raw = {
      irVersion: "1.0.0",
      okfVersion: "0.1.0",
      bundleId: "test-bundle",
      buildId: "test-build",
      timestamp: "2026-07-08T00:00:00Z",
      concepts: [
        {
          conceptId: "test-concept",
          type: "UnknownType",
          source: { filePath: "test.md", format: "okf/markdown" },
          frontmatter: {
            type: "UnknownType",
            proprietaryKey: 42,
          },
          body: "Hello",
          budget: { byteSize: 5, estimatedTokens: 2 },
        },
      ],
    };

    const parsed = AgentKnowledgeIRSchema.parse(raw);
    expect(parsed.concepts[0].frontmatter.proprietaryKey).toBe(42);
    expect(parsed.concepts[0].type).toBe("UnknownType");
  });
});
