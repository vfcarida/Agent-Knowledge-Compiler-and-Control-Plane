import { describe, it, expect } from "vitest";
import { EnrichStage } from "../../../compiler/stages/enrich.js";
import type { PipelineContext } from "../../../compiler/pipeline.js";
import type { IRConcept } from "../../../ir/types.js";

function makeConcept(overrides: Partial<IRConcept> = {}): IRConcept {
  return {
    conceptId: "concept-1",
    type: "Document",
    source: { filePath: "concept-1.md", format: "okf/markdown" },
    frontmatter: {},
    body: "Some short body.",
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

describe("EnrichStage", () => {
  it("is a no-op on an empty concepts array", async () => {
    const context = baseContext({ concepts: [] });
    const result = await new EnrichStage().execute(context);
    expect(result.concepts).toEqual([]);
  });

  it("defaults status to active and isStale to false when there is no lifecycle metadata", async () => {
    const concept = makeConcept();
    const context = baseContext({ concepts: [concept] });

    const result = await new EnrichStage().execute(context);

    expect(result.concepts[0].status).toBe("active");
    expect(result.concepts[0].isStale).toBe(false);
  });

  it("derives status from frontmatter and only marks isStale true for 'stale' status", async () => {
    const deprecated = makeConcept({
      conceptId: "deprecated-doc",
      frontmatter: { status: "deprecated" },
    });
    const stale = makeConcept({
      conceptId: "stale-doc",
      frontmatter: {
        lastReviewedAt: "2000-01-01T00:00:00Z",
        reviewCadenceDays: 1,
      },
    });

    const context = baseContext({ concepts: [deprecated, stale] });
    const result = await new EnrichStage().execute(context);

    const deprecatedResult = result.concepts.find(
      (c) => c.conceptId === "deprecated-doc",
    )!;
    const staleResult = result.concepts.find(
      (c) => c.conceptId === "stale-doc",
    )!;

    expect(deprecatedResult.status).toBe("deprecated");
    expect(deprecatedResult.isStale).toBe(false);
    expect(staleResult.status).toBe("stale");
    expect(staleResult.isStale).toBe(true);
  });

  it("does not attach provenance when generateProvenance is not set", async () => {
    const concept = makeConcept();
    const context = baseContext({ concepts: [concept], options: {} });

    const result = await new EnrichStage().execute(context);

    expect(result.concepts[0].provenance).toBeUndefined();
  });

  it("attaches provenance with the matching sourceHash when generateProvenance is true", async () => {
    const concept = makeConcept({
      source: { filePath: "docs/a.md", format: "okf/markdown" },
    });
    const context = baseContext({
      concepts: [concept],
      options: { generateProvenance: true },
      sourceHashes: { "docs/a.md": "abc123" },
    });

    const result = await new EnrichStage().execute(context);
    const provenance = result.concepts[0].provenance!;

    expect(provenance).toBeDefined();
    expect(provenance.conceptId).toBe("concept-1");
    expect(provenance.sourceFile).toBe("docs/a.md");
    expect(provenance.sourceHash).toBe("abc123");
    expect(typeof provenance.timestamp).toBe("string");
  });

  it("falls back to an empty sourceHash when generateProvenance is true but no matching hash exists", async () => {
    const concept = makeConcept({
      source: { filePath: "docs/missing.md", format: "okf/markdown" },
    });
    const context = baseContext({
      concepts: [concept],
      options: { generateProvenance: true },
      sourceHashes: {},
    });

    const result = await new EnrichStage().execute(context);

    expect(result.concepts[0].provenance!.sourceHash).toBe("");
  });

  it("auto-generates a summary from the first qualifying paragraph when body is long and summary is absent", async () => {
    const qualifying =
      "This is the qualifying paragraph that is definitely more than twenty characters long.";
    const filler =
      "Padding sentence to grow the body past five hundred characters in total length. ".repeat(
        6,
      );
    const longBody = ["# Heading", "short", qualifying, filler].join("\n\n");
    expect(longBody.length).toBeGreaterThan(500);

    const concept = makeConcept({ body: longBody, frontmatter: {} });
    const context = baseContext({ concepts: [concept] });

    const result = await new EnrichStage().execute(context);

    expect(result.concepts[0].frontmatter.summary).toBe(qualifying);
  });

  it("falls back to a truncated body prefix when no paragraph qualifies as a summary", async () => {
    const longBody = "# H\n\n".repeat(150);
    expect(longBody.length).toBeGreaterThan(500);

    const concept = makeConcept({ body: longBody, frontmatter: {} });
    const context = baseContext({ concepts: [concept] });

    const result = await new EnrichStage().execute(context);

    const expected =
      longBody.substring(0, 300).replace(/\n/g, " ").trim() + "...";
    expect(result.concepts[0].frontmatter.summary).toBe(expected);
  });

  it("does not generate a summary when the body is not long enough", async () => {
    const concept = makeConcept({
      body: "Short body under the length limit.",
      frontmatter: {},
    });
    const context = baseContext({ concepts: [concept] });

    const result = await new EnrichStage().execute(context);

    expect(result.concepts[0].frontmatter.summary).toBeUndefined();
  });

  it("does not overwrite an existing summary even when the body is long", async () => {
    const filler =
      "Padding sentence to grow the body past five hundred characters. ".repeat(
        10,
      );
    const concept = makeConcept({
      body: filler,
      frontmatter: { summary: "existing summary" },
    });
    const context = baseContext({ concepts: [concept] });

    const result = await new EnrichStage().execute(context);

    expect(result.concepts[0].frontmatter.summary).toBe("existing summary");
  });
});
