import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NormalizeStage } from "../../../compiler/stages/normalize.js";
import { hashString } from "../../../provenance/hash.js";
import type { PipelineContext } from "../../../compiler/pipeline.js";
import type { RawKnowledgeItem } from "../../../connectors/types.js";

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

function rawItem(
  id: string,
  overrides: Partial<RawKnowledgeItem> = {},
): RawKnowledgeItem {
  return {
    sourceUri: `file:///bundle/${id}.md`,
    contentHash: `hash-${id}`,
    metadata: { relativePath: `${id}.md`, originalFormat: "okf/markdown" },
    rawContent: `---\ntype: Concept\n---\nBody for ${id}`,
    ...overrides,
  };
}

function writeCacheEntry(
  bundlePath: string,
  entries: Record<string, { sourceHash: string; artifactHash: string }>,
) {
  const cacheDir = path.join(bundlePath, ".akcp", "cache");
  fs.mkdirSync(cacheDir, { recursive: true });
  const state: Record<string, unknown> = {};
  for (const [sourceUri, { sourceHash, artifactHash }] of Object.entries(
    entries,
  )) {
    state[sourceUri] = {
      sourceHash,
      normalizedHash: "",
      artifactHash,
      lastCompiledAt: "2026-01-01T00:00:00Z",
      dependencies: [],
    };
  }
  fs.writeFileSync(
    path.join(cacheDir, "build-state.json"),
    JSON.stringify(state, null, 2),
  );
}

function writePriorIr(bundlePath: string, concepts: any[]) {
  const distDir = path.join(bundlePath, "dist");
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(
    path.join(distDir, "agent-knowledge-ir.json"),
    JSON.stringify({
      irVersion: "1.0.0",
      okfVersion: "0.1.0",
      bundleId: "b",
      buildId: "prev-build",
      timestamp: "2026-01-01T00:00:00Z",
      concepts,
    }),
  );
}

describe("NormalizeStage", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "akcp-normalize-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("normalizes all raw items fresh when there is no prior IR or build-state cache", async () => {
    const item = rawItem("concept1");
    const context = baseContext(tmpDir, { rawItems: [item] });

    const result = await new NormalizeStage().execute(context);

    expect(result.concepts).toHaveLength(1);
    expect(result.concepts[0].conceptId).toBe("concept1");
    expect(result.concepts[0].body).toBe("Body for concept1");
    expect(result.skippedCount).toBe(0);
    expect(result.sourceHashes[item.sourceUri]).toBe(item.contentHash);
  });

  it("resolves the previous-IR cache path against bundlePath, and stores a hash of the normalized concept (not the source contentHash, not the conceptId) as the build-state artifactHash", async () => {
    const item = rawItem("concept1");
    const context = baseContext(tmpDir, { rawItems: [item] });

    const result = await new NormalizeStage().execute(context);
    const normalizedConcept = result.concepts[0];

    const statePath = path.join(tmpDir, ".akcp", "cache", "build-state.json");
    expect(fs.existsSync(statePath)).toBe(true);

    const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
    const entry = state[item.sourceUri];

    expect(entry.sourceHash).toBe(item.contentHash);
    expect(entry.artifactHash).toBe(
      hashString(JSON.stringify(normalizedConcept)),
    );
    expect(entry.artifactHash).not.toBe(item.contentHash);
    expect(entry.artifactHash).not.toBe(normalizedConcept.conceptId);
  });

  it("reuses the previous concept and increments skippedCount when the incremental compiler reports the hash as unchanged", async () => {
    const item = rawItem("concept2");

    writeCacheEntry(tmpDir, {
      [item.sourceUri]: {
        sourceHash: item.contentHash,
        artifactHash: "prior-artifact-hash",
      },
    });

    const priorConcept = {
      conceptId: "concept2",
      type: "Concept",
      source: { filePath: item.sourceUri, format: "okf/markdown" },
      frontmatter: { type: "Concept", marker: "from-cache" },
      body: "Cached body, not re-derived from raw content",
      budget: { byteSize: 10, estimatedTokens: 3 },
      status: "active",
      isStale: false,
    };
    writePriorIr(tmpDir, [priorConcept]);

    const context = baseContext(tmpDir, { rawItems: [item] });
    const result = await new NormalizeStage().execute(context);

    expect(result.skippedCount).toBe(1);
    expect(result.concepts).toHaveLength(1);
    expect(result.concepts[0]).toEqual(priorConcept);
    expect(result.concepts[0].frontmatter.marker).toBe("from-cache");
  });

  it("normalizes fresh (does not skip) when the build-state cache matches but there is no prior IR to reuse a concept from", async () => {
    const item = rawItem("concept3");

    writeCacheEntry(tmpDir, {
      [item.sourceUri]: {
        sourceHash: item.contentHash,
        artifactHash: "prior-artifact-hash",
      },
    });
    // Deliberately no prior IR file written.

    const context = baseContext(tmpDir, { rawItems: [item] });
    const result = await new NormalizeStage().execute(context);

    expect(result.skippedCount).toBe(0);
    expect(result.concepts).toHaveLength(1);
    expect(result.concepts[0].body).toBe("Body for concept3");
  });

  it("populates sourceHashes for every raw item, whether skipped or freshly normalized, across multiple items", async () => {
    const cachedItem = rawItem("cached-concept");
    const freshItem = rawItem("fresh-concept");

    writeCacheEntry(tmpDir, {
      [cachedItem.sourceUri]: {
        sourceHash: cachedItem.contentHash,
        artifactHash: "prior-artifact-hash",
      },
    });
    writePriorIr(tmpDir, [
      {
        conceptId: "cached-concept",
        type: "Concept",
        source: { filePath: cachedItem.sourceUri, format: "okf/markdown" },
        frontmatter: { type: "Concept" },
        body: "Cached body",
        budget: { byteSize: 5, estimatedTokens: 2 },
        status: "active",
        isStale: false,
      },
    ]);

    const context = baseContext(tmpDir, { rawItems: [cachedItem, freshItem] });
    const result = await new NormalizeStage().execute(context);

    expect(result.sourceHashes).toEqual({
      [cachedItem.sourceUri]: cachedItem.contentHash,
      [freshItem.sourceUri]: freshItem.contentHash,
    });
    expect(result.skippedCount).toBe(1);
    expect(result.concepts).toHaveLength(2);
    expect(result.concepts.map((c) => c.conceptId).sort()).toEqual([
      "cached-concept",
      "fresh-concept",
    ]);
  });
});
