import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { IngestStage } from "../../../compiler/stages/ingest.js";
import type { PipelineContext } from "../../../compiler/pipeline.js";

function baseContext(
  bundlePath: string,
  overrides: Partial<PipelineContext> = {},
): PipelineContext {
  return {
    bundlePath,
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

describe("IngestStage", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "akcp-ingest-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("defaults to a single okf-directory source at bundlePath when no sources are configured", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "concept.md"),
      "---\ntype: Concept\n---\nBody content",
    );

    const context = baseContext(tmpDir);
    const result = await new IngestStage().execute(context);

    expect(result.rawItems).toHaveLength(1);
    expect(result.rawItems[0].metadata.relativePath).toBe("concept.md");
    expect(result.warnings).toHaveLength(0);
  });

  it("pushes exactly one unknown_source_type warning for an unrecognized source, while a valid source in the same array still contributes its items", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "concept.md"),
      "---\ntype: Concept\n---\nBody content",
    );

    const context = baseContext(tmpDir, {
      options: {
        sources: [
          { type: "carrier-pigeon", path: "." },
          { type: "okf-directory", path: "." },
        ],
      },
    });

    const result = await new IngestStage().execute(context);

    // Only the valid okf-directory source contributes items; the unknown one contributes none.
    expect(result.rawItems).toHaveLength(1);
    expect(result.rawItems[0].metadata.relativePath).toBe("concept.md");

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      type: "unknown_source_type",
      source: tmpDir,
    });
    expect(result.warnings[0].message).toContain("carrier-pigeon");
  });

  it("preserves pre-existing warnings on context when adding a new one", async () => {
    const context = baseContext(tmpDir, {
      warnings: [{ type: "stale_document", message: "pre-existing" }],
      options: { sources: [{ type: "nope" }] },
    });

    const result = await new IngestStage().execute(context);

    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0].message).toBe("pre-existing");
    expect(result.warnings[1].type).toBe("unknown_source_type");
    expect(result.rawItems).toHaveLength(0);
  });

  it("concatenates raw items from multiple valid sources", async () => {
    const dirA = path.join(tmpDir, "a");
    const dirB = path.join(tmpDir, "b");
    fs.mkdirSync(dirA);
    fs.mkdirSync(dirB);
    fs.writeFileSync(path.join(dirA, "one.md"), "---\ntype: Concept\n---\nOne");
    fs.writeFileSync(
      path.join(dirB, "two.md"),
      "# Plain markdown, no frontmatter",
    );

    const context = baseContext(tmpDir, {
      options: {
        sources: [
          { type: "okf-directory", path: "a" },
          { type: "markdown-directory", path: "b" },
        ],
      },
    });

    const result = await new IngestStage().execute(context);

    expect(result.rawItems).toHaveLength(2);
    const relPaths = result.rawItems.map((i) => i.metadata.relativePath).sort();
    expect(relPaths).toEqual(["one.md", "two.md"]);
    expect(result.warnings).toHaveLength(0);
  });

  it("resolves a mock-zendesk source (no filesystem path) alongside other sources", async () => {
    const context = baseContext(tmpDir, {
      options: { sources: [{ type: "mock-zendesk", ticketCount: 3 }] },
    });

    const result = await new IngestStage().execute(context);

    // MockZendeskConnector always emits ticketCount tickets + a fixed 20 customer profiles.
    expect(result.rawItems).toHaveLength(23);
    expect(result.warnings).toHaveLength(0);
  });
});
