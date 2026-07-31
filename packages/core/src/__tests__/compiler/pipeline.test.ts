import { describe, it, expect } from "vitest";
import type {
  PipelineContext,
  PipelineStage,
} from "../../compiler/pipeline.js";
import type { CompilerWarning } from "../../compiler/errors.js";
import type { PiiReportData } from "../../privacy/pii-report.js";

function makeContext(
  overrides: Partial<PipelineContext> = {},
): PipelineContext {
  return {
    bundlePath: "/tmp/bundle",
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

describe("PipelineContext / PipelineStage shape", () => {
  it("constructs a minimal valid PipelineContext with all required fields", () => {
    const context = makeContext();

    expect(context.bundlePath).toBe("/tmp/bundle");
    expect(context.options).toEqual({});
    expect(context.rawItems).toEqual([]);
    expect(context.concepts).toEqual([]);
    expect(context.links).toEqual([]);
    expect(context.sourceHashes).toEqual({});
    expect(context.skippedCount).toBe(0);
    expect(context.warnings).toEqual([]);
    expect(context.piiReport).toBeUndefined();
  });

  it("accepts an optional piiReport and a populated warnings array of CompilerWarning objects", () => {
    const warning: CompilerWarning = {
      type: "unknown_source_type",
      message: "boom",
      source: "src.md",
    };
    const piiReport: PiiReportData = {
      totalFindings: 1,
      blockedCount: 0,
      findingsByType: { email: 1 },
      details: [
        { file: "a.md", type: "email", start: 0, end: 5, confidence: "high" },
      ],
    };

    const context = makeContext({ warnings: [warning], piiReport });

    expect(context.warnings).toHaveLength(1);
    expect(context.warnings[0].type).toBe("unknown_source_type");
    expect(context.piiReport?.totalFindings).toBe(1);
    expect(context.piiReport?.findingsByType.email).toBe(1);
  });

  it("allows a trivial PipelineStage implementation to read and return the context", async () => {
    class PassthroughStage implements PipelineStage {
      name = "passthrough";
      async execute(context: PipelineContext): Promise<PipelineContext> {
        return { ...context, skippedCount: context.skippedCount + 1 };
      }
    }

    const stage = new PassthroughStage();
    const context = makeContext({ skippedCount: 5 });
    const result = await stage.execute(context);

    expect(stage.name).toBe("passthrough");
    expect(result.skippedCount).toBe(6);
    expect(result.bundlePath).toBe(context.bundlePath);
  });

  it("allows a stage to append warnings without discarding existing ones", async () => {
    class WarnStage implements PipelineStage {
      name = "warn";
      async execute(context: PipelineContext): Promise<PipelineContext> {
        return {
          ...context,
          warnings: [
            ...context.warnings,
            { type: "stale_document", message: "old doc" } as CompilerWarning,
          ],
        };
      }
    }

    const context = makeContext({
      warnings: [{ type: "pii_redacted", message: "redacted 1" }],
    });
    const result = await new WarnStage().execute(context);

    expect(result.warnings).toHaveLength(2);
    expect(result.warnings.map((w) => w.type)).toEqual([
      "pii_redacted",
      "stale_document",
    ]);
  });
});
