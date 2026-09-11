import { describe, it, expect } from "vitest";
import type { AgentKnowledgeIR } from "../../ir/types.js";
import {
  SemanticDiffEngine,
  diffKnowledgeIR,
  formatAsText,
  formatAsJson,
  formatAsMarkdown,
} from "../../diff/index.js";

function createMockIR(
  overrides: Partial<AgentKnowledgeIR> = {},
): AgentKnowledgeIR {
  return {
    irVersion: "0.1.0",
    okfVersion: "0.1.0",
    bundleId: "test-bundle",
    buildId: "build-1",
    timestamp: "2026-09-01T00:00:00.000Z",
    concepts: [
      {
        conceptId: "doc-1",
        type: "concept",
        source: {
          filePath: "docs/doc-1.md",
          format: "markdown",
          hash: "hash-doc-1",
        },
        frontmatter: { title: "Document One", tags: ["core"] },
        body: "Content for doc 1",
        budget: { byteSize: 100, estimatedTokens: 25 },
        status: "active",
      },
    ],
    links: [],
    policies: {
      defaultAutonomyLevel: "read-only",
      disableDangerousTools: true,
      requireApprovalFor: ["reboot_server"],
      piiHandling: "redact",
    },
    capabilities: [
      {
        id: "cap-1",
        kind: "tool",
        name: "reboot_server",
        description: "Reboots the production server",
        version: "1.0.0",
        riskLevel: "high",
        sideEffects: "external-write",
        requiresApproval: true,
        readsPII: false,
        writesPII: false,
      },
    ],
    ...overrides,
  };
}

describe("SemanticDiffEngine", () => {
  it("detects no differences between identical IRs", () => {
    const baseIR = createMockIR();
    const targetIR = createMockIR();

    const diff = diffKnowledgeIR(baseIR, targetIR);

    expect(diff.isBreaking).toBe(false);
    expect(diff.breakingReasons).toHaveLength(0);
    expect(diff.concepts.added).toHaveLength(0);
    expect(diff.concepts.removed).toHaveLength(0);
    expect(diff.concepts.modified).toHaveLength(0);
    expect(diff.capabilities).toHaveLength(0);
    expect(diff.policies).toHaveLength(0);
    expect(diff.links.added).toHaveLength(0);
    expect(diff.links.removed).toHaveLength(0);
    expect(diff.links.broken).toHaveLength(0);
  });

  describe("Concept Changes", () => {
    it("detects added concepts (non-breaking)", () => {
      const baseIR = createMockIR();
      const targetIR = createMockIR({
        concepts: [
          ...baseIR.concepts,
          {
            conceptId: "doc-2",
            type: "guide",
            source: {
              filePath: "docs/doc-2.md",
              format: "markdown",
              hash: "hash-doc-2",
            },
            frontmatter: { title: "Document Two" },
            body: "Content for doc 2",
            budget: { byteSize: 80, estimatedTokens: 20 },
            status: "active",
          },
        ],
      });

      const diff = diffKnowledgeIR(baseIR, targetIR);

      expect(diff.isBreaking).toBe(false);
      expect(diff.concepts.added).toHaveLength(1);
      expect(diff.concepts.added[0].conceptId).toBe("doc-2");
    });

    it("detects removed concepts as breaking change", () => {
      const baseIR = createMockIR();
      const targetIR = createMockIR({ concepts: [] });

      const diff = diffKnowledgeIR(baseIR, targetIR);

      expect(diff.isBreaking).toBe(true);
      expect(diff.concepts.removed).toHaveLength(1);
      expect(diff.breakingReasons[0]).toContain("Concept 'doc-1'");
    });

    it("detects concept modifications", () => {
      const baseIR = createMockIR();
      const targetIR = createMockIR({
        concepts: [
          {
            ...baseIR.concepts[0],
            source: { ...baseIR.concepts[0].source, hash: "new-hash" },
            budget: { byteSize: 200, estimatedTokens: 50 },
            frontmatter: {
              title: "Document One Modified",
              tags: ["core", "v2"],
            },
          },
        ],
      });

      const diff = diffKnowledgeIR(baseIR, targetIR);

      expect(diff.concepts.modified).toHaveLength(1);
      const mod = diff.concepts.modified[0];
      expect(mod.conceptId).toBe("doc-1");
      const changedFields = mod.changes?.map((c) => c.field);
      expect(changedFields).toContain("contentHash");
      expect(changedFields).toContain("estimatedTokens");
      expect(changedFields).toContain("frontmatter.title");
    });

    it("flags concept deprecation/archival as breaking", () => {
      const baseIR = createMockIR();
      const targetIR = createMockIR({
        concepts: [
          {
            ...baseIR.concepts[0],
            status: "deprecated",
          },
        ],
      });

      const diff = diffKnowledgeIR(baseIR, targetIR);
      expect(diff.isBreaking).toBe(true);
      expect(diff.breakingReasons[0]).toContain(
        "status transitioned from 'active' to 'deprecated'",
      );
    });
  });

  describe("Capability & Tool Changes", () => {
    it("flags riskLevel escalation as breaking", () => {
      const baseIR = createMockIR();
      const targetIR = createMockIR({
        capabilities: [
          {
            ...baseIR.capabilities![0],
            riskLevel: "critical",
          },
        ],
      });

      const diff = diffKnowledgeIR(baseIR, targetIR);

      expect(diff.isBreaking).toBe(true);
      expect(diff.capabilities).toHaveLength(1);
      expect(diff.capabilities[0].isBreaking).toBe(true);
      expect(diff.breakingReasons.some((r) => r.includes("critical"))).toBe(
        true,
      );
    });

    it("does not flag riskLevel de-escalation as breaking", () => {
      const baseIR = createMockIR();
      const targetIR = createMockIR({
        capabilities: [
          {
            ...baseIR.capabilities![0],
            riskLevel: "medium",
          },
        ],
      });

      const diff = diffKnowledgeIR(baseIR, targetIR);

      expect(diff.isBreaking).toBe(false);
      expect(diff.capabilities[0].isBreaking).toBe(false);
    });

    it("flags sideEffects escalation as breaking", () => {
      const baseIR = createMockIR({
        capabilities: [
          {
            ...createMockIR().capabilities![0],
            sideEffects: "none",
          },
        ],
      });
      const targetIR = createMockIR({
        capabilities: [
          {
            ...createMockIR().capabilities![0],
            sideEffects: "external-write",
          },
        ],
      });

      const diff = diffKnowledgeIR(baseIR, targetIR);

      expect(diff.isBreaking).toBe(true);
      expect(
        diff.breakingReasons.some((r) =>
          r.includes("Side effect severity increased"),
        ),
      ).toBe(true);
    });

    it("flags removal of human-in-the-loop approval as breaking", () => {
      const baseIR = createMockIR();
      const targetIR = createMockIR({
        capabilities: [
          {
            ...baseIR.capabilities![0],
            requiresApproval: false,
          },
        ],
      });

      const diff = diffKnowledgeIR(baseIR, targetIR);

      expect(diff.isBreaking).toBe(true);
      expect(
        diff.breakingReasons.some((r) =>
          r.includes("Mandatory human-in-the-loop approval was removed"),
        ),
      ).toBe(true);
    });

    it("flags newly enabling readsPII or writesPII as breaking", () => {
      const baseIR = createMockIR();
      const targetIR = createMockIR({
        capabilities: [
          {
            ...baseIR.capabilities![0],
            readsPII: true,
            writesPII: true,
          },
        ],
      });

      const diff = diffKnowledgeIR(baseIR, targetIR);

      expect(diff.isBreaking).toBe(true);
      expect(diff.breakingReasons.some((r) => r.includes("readsPII"))).toBe(
        true,
      );
      expect(diff.breakingReasons.some((r) => r.includes("writesPII"))).toBe(
        true,
      );
    });

    it("flags removal of an existing capability as breaking", () => {
      const baseIR = createMockIR();
      const targetIR = createMockIR({ capabilities: [] });

      const diff = diffKnowledgeIR(baseIR, targetIR);

      expect(diff.isBreaking).toBe(true);
      expect(
        diff.breakingReasons.some((r) => r.includes("Capability 'cap-1'")),
      ).toBe(true);
    });
  });

  describe("Policy & Governance Changes", () => {
    it("flags autonomy escalation as breaking", () => {
      const baseIR = createMockIR({
        policies: { defaultAutonomyLevel: "read-only" },
      });
      const targetIR = createMockIR({
        policies: { defaultAutonomyLevel: "autonomous" },
      });

      const diff = diffKnowledgeIR(baseIR, targetIR);

      expect(diff.isBreaking).toBe(true);
      expect(
        diff.breakingReasons.some((r) =>
          r.includes("Autonomy level escalated"),
        ),
      ).toBe(true);
    });

    it("flags enabling dangerous tools as breaking", () => {
      const baseIR = createMockIR({
        policies: { disableDangerousTools: true },
      });
      const targetIR = createMockIR({
        policies: { disableDangerousTools: false },
      });

      const diff = diffKnowledgeIR(baseIR, targetIR);

      expect(diff.isBreaking).toBe(true);
      expect(
        diff.breakingReasons.some((r) => r.includes("disableDangerousTools")),
      ).toBe(true);
    });

    it("flags removal of an action from requireApprovalFor as breaking", () => {
      const baseIR = createMockIR({
        policies: { requireApprovalFor: ["reboot_server", "drop_db"] },
      });
      const targetIR = createMockIR({
        policies: { requireApprovalFor: ["drop_db"] },
      });

      const diff = diffKnowledgeIR(baseIR, targetIR);

      expect(diff.isBreaking).toBe(true);
      expect(
        diff.breakingReasons.some((r) =>
          r.includes(
            "Approval requirement removed for high-risk action 'reboot_server'",
          ),
        ),
      ).toBe(true);
    });
  });

  describe("Graph Links & Broken Links", () => {
    it("detects added and removed links", () => {
      const baseIR = createMockIR({
        links: [
          {
            sourceConceptId: "doc-1",
            targetConceptId: "doc-1",
            relationType: "relates_to",
          },
        ],
      });
      const targetIR = createMockIR({
        links: [
          {
            sourceConceptId: "doc-1",
            targetConceptId: "doc-1",
            relationType: "prerequisite",
          },
        ],
      });

      const diff = diffKnowledgeIR(baseIR, targetIR);

      expect(diff.links.added).toHaveLength(1);
      expect(diff.links.removed).toHaveLength(1);
    });

    it("detects broken links targeting missing concepts as breaking", () => {
      const baseIR = createMockIR();
      const targetIR = createMockIR({
        links: [
          {
            sourceConceptId: "doc-1",
            targetConceptId: "nonexistent-doc",
            relationType: "relates_to",
          },
        ],
      });

      const diff = diffKnowledgeIR(baseIR, targetIR);

      expect(diff.isBreaking).toBe(true);
      expect(diff.links.broken).toHaveLength(1);
      expect(
        diff.breakingReasons.some((r) => r.includes("nonexistent-doc")),
      ).toBe(true);
    });
  });

  describe("Formatters", () => {
    it("formats diff result as text, json, and markdown", () => {
      const baseIR = createMockIR();
      const targetIR = createMockIR({
        capabilities: [
          {
            ...baseIR.capabilities![0],
            riskLevel: "critical",
          },
        ],
      });

      const diff = diffKnowledgeIR(baseIR, targetIR);

      const text = formatAsText(diff);
      expect(text).toContain("BREAKING CHANGES DETECTED");
      expect(text).toContain("critical");

      const json = formatAsJson(diff);
      const parsed = JSON.parse(json);
      expect(parsed.isBreaking).toBe(true);

      const md = formatAsMarkdown(diff);
      expect(md).toContain("AKCP Semantic & Governance Diff Report");
      expect(md).toContain("CAUTION");
      expect(md).toContain("Capability & Tool Changes");
    });
  });
});
