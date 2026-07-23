import { describe, it, expect } from "vitest";
import {
  extractMarkdownLinks,
  normalizeLinkId,
} from "../../graph/extract-links.js";
import { computeImpactMap } from "../../graph/impact-analysis.js";
import type { GraphEdge } from "../../graph/types.js";

describe("Graph Subsystem", () => {
  describe("normalizeLinkId", () => {
    it("normalizes relative links", () => {
      expect(
        normalizeLinkId("skills/typescript", "../experiences/company-a.md"),
      ).toBe("experiences/company-a");
      expect(normalizeLinkId("skills/typescript", "./javascript.md")).toBe(
        "skills/javascript",
      );
    });

    it("normalizes absolute links", () => {
      expect(
        normalizeLinkId("skills/typescript", "/policies/security.md"),
      ).toBe("policies/security");
    });

    it("ignores external links", () => {
      expect(normalizeLinkId("skills/typescript", "https://github.com")).toBe(
        "https://github.com",
      );
    });
  });

  describe("extractMarkdownLinks", () => {
    it("extracts valid internal links", () => {
      const body = `This is a test linking to [My Skill](../skills/typescript.md) and [Security policy](/policies/security.md). External [Google](https://google.com)`;
      const links = extractMarkdownLinks("experiences/company", body);

      expect(links).toHaveLength(2);
      expect(links).toEqual(
        expect.arrayContaining([
          {
            targetConceptId: "skills/typescript",
            relationType: "markdown_link",
          },
          {
            targetConceptId: "policies/security",
            relationType: "markdown_link",
          },
        ]),
      );
    });
  });

  describe("computeImpactMap", () => {
    it("computes transitive reverse dependencies", () => {
      const edges: GraphEdge[] = [
        {
          sourceConceptId: "app-a",
          targetConceptId: "api-b",
          relationType: "relates_to",
        },
        {
          sourceConceptId: "api-b",
          targetConceptId: "db-c",
          relationType: "relates_to",
        },
      ];

      const map = computeImpactMap(edges);

      // db-c should impact api-b and app-a
      expect(map["db-c"]).toContain("api-b");
      expect(map["db-c"]).toContain("app-a");

      // api-b should impact app-a
      expect(map["api-b"]).toContain("app-a");
      expect(map["api-b"]).not.toContain("db-c");
    });

    it("ignores broken links", () => {
      const edges: GraphEdge[] = [
        {
          sourceConceptId: "app-a",
          targetConceptId: "db-c",
          relationType: "relates_to",
          isBroken: true,
        },
      ];
      const map = computeImpactMap(edges);
      expect(map["db-c"]).toBeUndefined();
    });
  });
});
