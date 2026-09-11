import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ValidateStage } from "../../../compiler/stages/validate.js";
import type { PipelineContext } from "../../../compiler/pipeline.js";
import type { Capability } from "../../../ir/types.js";

function baseContext(
  overrides: Partial<PipelineContext> = {},
): PipelineContext {
  return {
    bundlePath: "/bundle",
    options: {},
    rawItems: [],
    concepts: [],
    links: [],
    sourceHashes: {},
    skippedCount: 0,
    warnings: [],
    ...overrides,
  };
}

function validCapability(overrides: Partial<Capability> = {}): Capability {
  return {
    id: "cap-1",
    kind: "tool",
    name: "Send Email",
    description: "Sends an email on behalf of the user.",
    version: "1.0.0",
    riskLevel: "medium",
    sideEffects: "external-submit",
    ...overrides,
  };
}

describe("ValidateStage", () => {
  it("passes a valid capabilities array through unchanged in shape", async () => {
    const capability = validCapability();
    const context = baseContext({ options: { capabilities: [capability] } });

    const result = await new ValidateStage().execute(context);

    expect(result.options.capabilities).toHaveLength(1);
    expect(result.options.capabilities![0]).toMatchObject(capability);
  });

  it("mutates and returns the same context reference on success", async () => {
    const context = baseContext({
      options: { capabilities: [validCapability()] },
    });

    const result = await new ValidateStage().execute(context);

    expect(result).toBe(context);
  });

  it("throws a ZodError when capabilities are missing required fields", async () => {
    const invalidCapability = {
      id: "cap-1",
      // missing kind, name, description, version, riskLevel, sideEffects
    };
    const context = baseContext({
      options: { capabilities: [invalidCapability as any] },
    });

    await expect(new ValidateStage().execute(context)).rejects.toBeInstanceOf(
      z.ZodError,
    );
  });

  it("throws a ZodError when a capability field has the wrong enum value", async () => {
    const invalidCapability = validCapability({
      riskLevel: "extreme" as any,
    });
    const context = baseContext({
      options: { capabilities: [invalidCapability] },
    });

    await expect(new ValidateStage().execute(context)).rejects.toBeInstanceOf(
      z.ZodError,
    );
  });

  it("is a no-op when capabilities is undefined", async () => {
    const context = baseContext({ options: {} });

    const result = await new ValidateStage().execute(context);

    expect(result.options.capabilities).toBeUndefined();
  });

  it("is a no-op when capabilities is an empty array", async () => {
    const context = baseContext({ options: { capabilities: [] } });

    const result = await new ValidateStage().execute(context);

    expect(result.options.capabilities).toEqual([]);
  });

  describe("Semantic Graph Validation", () => {
    it("passes when all links target existing concepts", async () => {
      const context = baseContext({
        concepts: [
          {
            conceptId: "doc-1",
            type: "Document",
            source: { filePath: "doc-1.md", format: "okf/markdown" },
            frontmatter: {},
            body: "",
            budget: { byteSize: 10, estimatedTokens: 3 },
          },
          {
            conceptId: "doc-2",
            type: "Document",
            source: { filePath: "doc-2.md", format: "okf/markdown" },
            frontmatter: {},
            body: "",
            budget: { byteSize: 10, estimatedTokens: 3 },
          },
        ],
        links: [
          {
            sourceConceptId: "doc-1",
            targetConceptId: "doc-2",
            relationType: "relates_to",
          },
        ],
      });

      const result = await new ValidateStage().execute(context);
      expect(result.warnings).toHaveLength(0);
    });

    it("records a warning when a link targets a nonexistent concept", async () => {
      const context = baseContext({
        concepts: [
          {
            conceptId: "doc-1",
            type: "Document",
            source: { filePath: "doc-1.md", format: "okf/markdown" },
            frontmatter: {},
            body: "",
            budget: { byteSize: 10, estimatedTokens: 3 },
          },
        ],
        links: [
          {
            sourceConceptId: "doc-1",
            targetConceptId: "ghost-concept",
            relationType: "relates_to",
          },
        ],
      });

      const result = await new ValidateStage().execute(context);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe("missing_link_target");
      expect(result.warnings[0].message).toContain("ghost-concept");
    });

    it("throws an error when a link targets a nonexistent concept in strict mode", async () => {
      const context = baseContext({
        options: { strict: true },
        concepts: [
          {
            conceptId: "doc-1",
            type: "Document",
            source: { filePath: "doc-1.md", format: "okf/markdown" },
            frontmatter: {},
            body: "",
            budget: { byteSize: 10, estimatedTokens: 3 },
          },
        ],
        links: [
          {
            sourceConceptId: "doc-1",
            targetConceptId: "ghost-concept",
            relationType: "relates_to",
          },
        ],
      });

      await expect(new ValidateStage().execute(context)).rejects.toThrow(
        /Broken link reference.*ghost-concept/,
      );
    });

    it("detects circular dependencies in prerequisite / depends_on chains", async () => {
      const context = baseContext({
        concepts: [
          {
            conceptId: "step-1",
            type: "Document",
            source: { filePath: "step-1.md", format: "okf/markdown" },
            frontmatter: {},
            body: "",
            budget: { byteSize: 10, estimatedTokens: 3 },
          },
          {
            conceptId: "step-2",
            type: "Document",
            source: { filePath: "step-2.md", format: "okf/markdown" },
            frontmatter: {},
            body: "",
            budget: { byteSize: 10, estimatedTokens: 3 },
          },
          {
            conceptId: "step-3",
            type: "Document",
            source: { filePath: "step-3.md", format: "okf/markdown" },
            frontmatter: {},
            body: "",
            budget: { byteSize: 10, estimatedTokens: 3 },
          },
        ],
        links: [
          {
            sourceConceptId: "step-1",
            targetConceptId: "step-2",
            relationType: "depends_on",
          },
          {
            sourceConceptId: "step-2",
            targetConceptId: "step-3",
            relationType: "depends_on",
          },
          {
            sourceConceptId: "step-3",
            targetConceptId: "step-1",
            relationType: "depends_on",
          },
        ],
      });

      const result = await new ValidateStage().execute(context);
      const cycleWarnings = result.warnings.filter(
        (w) => w.type === "circular_dependency",
      );
      expect(cycleWarnings.length).toBeGreaterThanOrEqual(1);
      expect(cycleWarnings[0].message).toContain(
        "step-1 -> step-2 -> step-3 -> step-1",
      );
    });

    it("throws an error when circular dependency is detected in strict mode", async () => {
      const context = baseContext({
        options: { strict: true },
        concepts: [
          {
            conceptId: "a",
            type: "Document",
            source: { filePath: "a.md", format: "okf/markdown" },
            frontmatter: {},
            body: "",
            budget: { byteSize: 10, estimatedTokens: 3 },
          },
          {
            conceptId: "b",
            type: "Document",
            source: { filePath: "b.md", format: "okf/markdown" },
            frontmatter: {},
            body: "",
            budget: { byteSize: 10, estimatedTokens: 3 },
          },
        ],
        links: [
          {
            sourceConceptId: "a",
            targetConceptId: "b",
            relationType: "prerequisite",
          },
          {
            sourceConceptId: "b",
            targetConceptId: "a",
            relationType: "prerequisite",
          },
        ],
      });

      await expect(new ValidateStage().execute(context)).rejects.toThrow(
        /Circular dependency detected/,
      );
    });

    it("allows acyclic directed dependency chains without warnings", async () => {
      const context = baseContext({
        concepts: [
          {
            conceptId: "a",
            type: "Document",
            source: { filePath: "a.md", format: "okf/markdown" },
            frontmatter: {},
            body: "",
            budget: { byteSize: 10, estimatedTokens: 3 },
          },
          {
            conceptId: "b",
            type: "Document",
            source: { filePath: "b.md", format: "okf/markdown" },
            frontmatter: {},
            body: "",
            budget: { byteSize: 10, estimatedTokens: 3 },
          },
          {
            conceptId: "c",
            type: "Document",
            source: { filePath: "c.md", format: "okf/markdown" },
            frontmatter: {},
            body: "",
            budget: { byteSize: 10, estimatedTokens: 3 },
          },
        ],
        links: [
          {
            sourceConceptId: "a",
            targetConceptId: "b",
            relationType: "depends_on",
          },
          {
            sourceConceptId: "b",
            targetConceptId: "c",
            relationType: "depends_on",
          },
        ],
      });

      const result = await new ValidateStage().execute(context);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
