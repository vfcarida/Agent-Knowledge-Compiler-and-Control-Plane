import { describe, it, expect } from "vitest";
import { calculateScorecard } from "../../scorecard/calculate.js";
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
import { ScorecardDimension } from "../../scorecard/types.js";
import type { AgentKnowledgeIR } from "../../ir/types.js";

describe("calculateScorecard", () => {
  const mockIR: AgentKnowledgeIR = {
    irVersion: "1.0.0",
    okfVersion: "0.1.0",
    bundleId: "test-bundle",
    buildId: "bld_123",
    timestamp: new Date().toISOString(),
    concepts: [],
    links: [],
    targets: [],
    sourceHashes: {},
  };

  it("calculates 100 points for a perfect IR", () => {
    const perfectIR: AgentKnowledgeIR = {
      ...mockIR,
      concepts: [
        {
          conceptId: "skills/test",
          type: "skill",
          source: { filePath: "skills/test.md", format: "markdown" },
          frontmatter: { type: "skill" },
          body: "",
          budget: { byteSize: 100, estimatedTokens: 50 },
          provenance: {
            conceptId: "skills/test",
            sourceFile: "test.md",
            sourceHash: "hash",
            timestamp: "time",
          },
          isStale: false,
        },
      ],
      targets: ["mcp-profile-server", "eval-dataset"],
      policies: {
        defaultAutonomyLevel: "read-only",
      },
    };

    const report = calculateScorecard(perfectIR, [
      { path: "index.md", content: "Index" },
      { path: "log.md", content: "Log" },
      { path: "__tests__/example.test.ts", content: "Test" },
    ]);

    expect(report.totalScore).toBe(100);
    expect(report.recommendations.length).toBe(0);
  });

  it("calculates partial points and generates recommendations", () => {
    const poorIR: AgentKnowledgeIR = {
      ...mockIR,
      concepts: [
        {
          conceptId: "test", // Not in subfolder
          type: "skill",
          source: { filePath: "test.md", format: "markdown" },
          frontmatter: {}, // Missing type
          body: "",
          budget: { byteSize: 10000, estimatedTokens: 2500 }, // Expensive
          isStale: true, // Stale
        },
      ],
      targets: ["ir-json"], // No MCP, No evals
      policies: {}, // Empty policies
    };

    const report = calculateScorecard(poorIR, []);

    // 0 for Structure (root file)
    // 0 for OKF (no type)
    // 2 for Economy (2500 tokens)
    // 0 for MCP
    // 0 for Policy
    // 0 for Security
    // 0 for Provenance
    // 0 for Evals
    // 2 for Freshness (100% stale)
    // 0 for DX (no index or log)
    expect(report.totalScore).toBe(4);

    const recs = report.recommendations;
    expect(recs.length).toBe(10);

    // Recommendations should be sorted by impact (high first)
    expect(recs[0].impact).toBe("high");
  });
});
