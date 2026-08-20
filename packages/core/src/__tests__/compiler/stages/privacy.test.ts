import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PrivacyStage } from "../../../compiler/stages/privacy.js";
import type { PipelineContext } from "../../../compiler/pipeline.js";
import type { IRConcept } from "../../../ir/types.js";
import fs from "node:fs";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn().mockReturnValue(true),
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
    },
  };
});

function makeConcept(overrides: Partial<IRConcept> = {}): IRConcept {
  return {
    conceptId: "doc-1",
    type: "Document",
    source: { filePath: "docs/doc-1.md", format: "okf/markdown" },
    frontmatter: {},
    body: "Contact John at john.doe@example.com for info.",
    budget: { byteSize: 45, estimatedTokens: 12 },
    ...overrides,
  };
}

function baseContext(
  overrides: Partial<PipelineContext> = {},
): PipelineContext {
  return {
    bundlePath: "/test-bundle",
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

describe("PrivacyStage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("skips privacy processing when privacy option is not set", async () => {
    const concept = makeConcept();
    const context = baseContext({ concepts: [concept] });
    const result = await new PrivacyStage().execute(context);

    expect(result.concepts[0].body).toBe(
      "Contact John at john.doe@example.com for info.",
    );
    expect(result.piiReport).toBeUndefined();
  });

  it("redacts PII in concept bodies when privacy option is enabled", async () => {
    const concept = makeConcept();
    const context = baseContext({
      concepts: [concept],
      options: {
        privacy: {
          defaultPiiMode: "redact",
        },
      },
    });

    const result = await new PrivacyStage().execute(context);

    expect(result.concepts[0].body).toContain("<EMAIL_REDACTED>");
    expect(result.piiReport).toBeDefined();
    expect(result.piiReport?.totalFindings).toBeGreaterThan(0);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it("throws build error when failOnUnredactedHighRiskPii triggers blocked finding", async () => {
    const concept = makeConcept({
      body: "User SSN is 000-12-3456 confidential.",
    });
    const context = baseContext({
      concepts: [concept],
      options: {
        privacy: {
          defaultPiiMode: "detect-only" as any,
          blockedPiiClasses: ["ssn"],
          failOnUnredactedHighRiskPii: true,
        },
      },
    });

    await expect(new PrivacyStage().execute(context)).rejects.toThrow(
      /Unredacted high-risk PII/,
    );
  });
});
