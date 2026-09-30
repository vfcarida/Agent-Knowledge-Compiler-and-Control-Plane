import { describe, it, expect, beforeEach } from "vitest";
import { IrJsonTarget } from "../../targets/ir-json.js";
import { OkfBundleTarget } from "../../targets/okf-bundle.js";
import { OpenWikiDocsTarget } from "../../targets/openwiki-docs.js";
import { AgentsMdTarget } from "../../targets/agents-md.js";
import { McpResourcesManifestTarget } from "../../targets/mcp-resources-manifest.js";
import { PolicyBundleTarget } from "../../targets/policy-bundle.js";
import { EvalDatasetTarget } from "../../targets/eval-dataset.js";
import { GraphJsonTarget } from "../../targets/graph-json.js";
import type { AgentKnowledgeIR } from "../../ir/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const mockIR: AgentKnowledgeIR = {
  irVersion: "1.0.0",
  okfVersion: "0.1.0",
  bundleId: "test-bundle",
  buildId: "test-build",
  timestamp: "2025-01-01T00:00:00.000Z",
  targets: [],
  capabilities: ["test-capability"],
  policies: {
    requireApprovalFor: ["dangerous-tool"],
  },
  concepts: [
    {
      conceptId: "concept1",
      type: "Concept",
      frontmatter: { type: "Concept", title: "Concept 1" },
      body: "This is concept 1.",
      budget: { byteSize: 20, estimatedTokens: 5 },
      source: { format: "okf/markdown", filePath: "concept1.md" },
    },
    {
      conceptId: "concept2",
      type: "Concept",
      frontmatter: { type: "Concept", title: "Concept 2" },
      body: "This is concept 2.",
      budget: { byteSize: 20, estimatedTokens: 5 },
      source: { format: "okf/markdown", filePath: "concept2.md" },
    },
  ],
  links: [
    {
      sourceConceptId: "concept1",
      targetConceptId: "concept2",
      relationType: "relates_to",
    },
  ],
};

describe("Compile Targets Determinism", () => {
  let tmpDir1: string;
  let tmpDir2: string;

  beforeEach(async () => {
    tmpDir1 = await fs.mkdtemp(path.join(os.tmpdir(), "target-det1-"));
    tmpDir2 = await fs.mkdtemp(path.join(os.tmpdir(), "target-det2-"));
  });

  const testTargetDeterminism = async (TargetClass: any, outName: string) => {
    const target1 = new TargetClass();
    const target2 = new TargetClass();

    const out1 = await target1.compile(mockIR, {
      type: target1.targetType,
      out: path.join(tmpDir1, outName),
    });
    const out2 = await target2.compile(mockIR, {
      type: target2.targetType,
      out: path.join(tmpDir2, outName),
    });

    expect(out1.hash).toBe(out2.hash);
    expect(out1.bytesWritten).toBe(out2.bytesWritten);
    // ensure output exists
    const exists = await fs
      .access(out1.outputPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  };

  it("IrJsonTarget should be deterministic", () =>
    testTargetDeterminism(IrJsonTarget, "ir.json"));
  it("OkfBundleTarget should be deterministic", () =>
    testTargetDeterminism(OkfBundleTarget, "bundle.okf"));
  it("OpenWikiDocsTarget should be deterministic", () =>
    testTargetDeterminism(OpenWikiDocsTarget, "wiki"));
  it("AgentsMdTarget should be deterministic", () =>
    testTargetDeterminism(AgentsMdTarget, "agents-snippet.md"));
  it("McpResourcesManifestTarget should be deterministic", () =>
    testTargetDeterminism(McpResourcesManifestTarget, "manifest.json"));
  it("PolicyBundleTarget should be deterministic", () =>
    testTargetDeterminism(PolicyBundleTarget, "policies.json"));
  it("EvalDatasetTarget should be deterministic", () =>
    testTargetDeterminism(EvalDatasetTarget, "eval.jsonl"));
  it("GraphJsonTarget should be deterministic", () =>
    testTargetDeterminism(GraphJsonTarget, "graph.json"));
});
