import { describe, it, expect } from "vitest";
import {
  runRetrievalGroundingEval,
  DEFAULT_RETRIEVAL_TEST_CASES,
  DEFAULT_RETRIEVAL_CORPUS,
} from "../retrieval-grounding.js";

describe("Retrieval Grounding Eval", () => {
  it("should evaluate retrieval precision@k and recall@k on default corpus", async () => {
    const result = await runRetrievalGroundingEval();

    expect(result.scenario).toBe("retrieval-grounding");
    expect(result.totalQueries).toBe(DEFAULT_RETRIEVAL_TEST_CASES.length);
    expect(result.totalQueries).toBeGreaterThanOrEqual(10);
    expect(result.details.length).toBe(result.totalQueries);

    // Acceptance criteria: retrieval eval reports precision@k >= 0.8
    expect(result.meanPrecisionAtK).toBeGreaterThanOrEqual(0.8);

    // Hit rate should be high (all queries should hit relevant knowledge)
    expect(result.hitRate).toBeGreaterThanOrEqual(0.9);

    // Scenario eval should pass
    expect(result.passed).toBe(true);
  });

  it("should support custom test cases and document subsets", async () => {
    const customTestCases = [
      {
        id: "custom-001",
        query: "PostgreSQL database connection pool exhaustion runbook",
        profile: "it-operations",
        expectedConceptIds: ["doc-db-pool-exhaustion"],
        k: 1,
      },
    ];

    const result = await runRetrievalGroundingEval({
      documents: DEFAULT_RETRIEVAL_CORPUS,
      testCases: customTestCases,
    });

    expect(result.totalQueries).toBe(1);
    expect(result.meanPrecisionAtK).toBe(1.0);
    expect(result.meanRecallAtK).toBe(1.0);
    expect(result.passed).toBe(true);
  });
});
