import { describe, it, expect } from "vitest";
import { LinkExtractStage } from "../../../compiler/stages/link-extract.js";
import type { PipelineContext } from "../../../compiler/pipeline.js";
import type { IRConcept } from "../../../ir/types.js";

function makeConcept(overrides: Partial<IRConcept> = {}): IRConcept {
  return {
    conceptId: "concept-1",
    type: "Document",
    source: { filePath: "concept-1.md", format: "okf/markdown" },
    frontmatter: {},
    body: "",
    budget: { byteSize: 10, estimatedTokens: 3 },
    ...overrides,
  };
}

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

describe("LinkExtractStage", () => {
  it("returns an empty links array for an empty concepts array", async () => {
    const context = baseContext({ concepts: [] });
    const result = await new LinkExtractStage().execute(context);
    expect(result.links).toEqual([]);
  });

  it("builds links from frontmatter.links, defaulting relationType to relates_to", async () => {
    const concept = makeConcept({
      conceptId: "guide",
      frontmatter: {
        links: [
          { target: "intro", type: "depends_on" },
          { target: "no-type-here" },
        ],
      },
    });
    const context = baseContext({ concepts: [concept] });

    const result = await new LinkExtractStage().execute(context);

    expect(result.links).toEqual([
      {
        sourceConceptId: "guide",
        targetConceptId: "intro",
        relationType: "depends_on",
      },
      {
        sourceConceptId: "guide",
        targetConceptId: "no-type-here",
        relationType: "relates_to",
      },
    ]);
  });

  it("skips frontmatter link entries missing a target", async () => {
    const concept = makeConcept({
      frontmatter: { links: [{ type: "depends_on" }] },
    });
    const context = baseContext({ concepts: [concept] });

    const result = await new LinkExtractStage().execute(context);

    expect(result.links).toEqual([]);
  });

  it("extracts markdown body links and ignores external/mailto links", async () => {
    const concept = makeConcept({
      conceptId: "docs/intro",
      body: "See the [Guide](./guide.md) for details, and ignore [external](https://example.com) and [mail](mailto:a@b.com).",
    });
    const context = baseContext({ concepts: [concept] });

    const result = await new LinkExtractStage().execute(context);

    expect(result.links).toEqual([
      {
        sourceConceptId: "docs/intro",
        targetConceptId: "docs/guide",
        relationType: "markdown_link",
      },
    ]);
  });

  it("deduplicates a markdown body link against an identical frontmatter link", async () => {
    const concept = makeConcept({
      conceptId: "docs/intro",
      frontmatter: { links: [{ target: "docs/guide", type: "markdown_link" }] },
      body: "See the [Guide](./guide.md) for details.",
    });
    const context = baseContext({ concepts: [concept] });

    const result = await new LinkExtractStage().execute(context);

    expect(result.links).toHaveLength(1);
    expect(result.links[0]).toEqual({
      sourceConceptId: "docs/intro",
      targetConceptId: "docs/guide",
      relationType: "markdown_link",
    });
  });

  it("flattens links across multiple concepts", async () => {
    const a = makeConcept({
      conceptId: "a",
      frontmatter: { links: [{ target: "b" }] },
    });
    const b = makeConcept({
      conceptId: "b",
      frontmatter: { links: [{ target: "a" }] },
    });
    const context = baseContext({ concepts: [a, b] });

    const result = await new LinkExtractStage().execute(context);

    expect(result.links).toEqual([
      {
        sourceConceptId: "a",
        targetConceptId: "b",
        relationType: "relates_to",
      },
      {
        sourceConceptId: "b",
        targetConceptId: "a",
        relationType: "relates_to",
      },
    ]);
  });

  it("does not crash when body is empty and frontmatter.links is not an array", async () => {
    const concept = makeConcept({
      body: "",

      frontmatter: { links: "not-an-array" as any },
    });
    const context = baseContext({ concepts: [concept] });

    const result = await new LinkExtractStage().execute(context);

    expect(result.links).toEqual([]);
  });
});
