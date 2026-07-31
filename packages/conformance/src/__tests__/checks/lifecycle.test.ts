import { describe, it, expect } from "vitest";
import { checkLifecycleConsistency } from "../../checks/lifecycle.js";
import type { AgentKnowledgeIR } from "@akcp/core";

function concept(overrides: Record<string, unknown> = {}) {
  return {
    conceptId: "c1",
    type: "Document",
    source: { filePath: "c1.md", format: "markdown" },
    frontmatter: {},
    body: "",
    budget: { byteSize: 0, estimatedTokens: 0 },
    ...overrides,
  };
}

function ir(concepts: unknown[], links: unknown[] = []): AgentKnowledgeIR {
  return {
    irVersion: "1.0.0",
    okfVersion: "0.1.0",
    bundleId: "test",
    buildId: "bld_test",
    timestamp: "2026-07-08T00:00:00Z",
    concepts,
    links,
  } as unknown as AgentKnowledgeIR;
}

describe("checkLifecycleConsistency", () => {
  it("treats a concept with no explicit status as active (documented default)", async () => {
    const results = await checkLifecycleConsistency(
      ir([concept({ conceptId: "a" })]),
    );
    const stateCheck = results.find(
      (r) => r.check === "lifecycle-state-valid" && r.target === "a",
    );
    expect(stateCheck?.passed).toBe(true);
  });

  it("reads the real status field (not a nonexistent nested lifecycle.state path)", async () => {
    const results = await checkLifecycleConsistency(
      ir([concept({ conceptId: "a", status: "deprecated" })]),
    );
    // If this still read the old (bogus) `concept.lifecycle.state` path, the
    // deprecated status here would be invisible and no dependent check would fire.
    const noDependentsCheck = results.find(
      (r) => r.check === "no-active-depends-on-deprecated" && r.target === "a",
    );
    expect(noDependentsCheck).toBeDefined();
  });

  it("flags an invalid lifecycle status", async () => {
    const results = await checkLifecycleConsistency(
      ir([concept({ conceptId: "a", status: "not-a-real-state" })]),
    );
    const stateCheck = results.find(
      (r) => r.check === "lifecycle-state-valid" && r.target === "a",
    );
    expect(stateCheck?.passed).toBe(false);
    expect(stateCheck?.message).toContain("Invalid lifecycle state");
  });

  it("flags an active concept depending on a deprecated one", async () => {
    const concepts = [
      concept({ conceptId: "active-one", status: "active" }),
      concept({ conceptId: "deprecated-one", status: "deprecated" }),
    ];
    const links = [
      {
        sourceConceptId: "active-one",
        targetConceptId: "deprecated-one",
        relationType: "references",
      },
    ];

    const results = await checkLifecycleConsistency(ir(concepts, links));
    const dependencyCheck = results.find(
      (r) =>
        r.check === "no-active-depends-on-deprecated" &&
        r.target === "deprecated-one",
    );
    expect(dependencyCheck?.passed).toBe(false);
    expect(dependencyCheck?.message).toContain("active-one");
  });

  it("does not flag a deprecated concept depending on another deprecated concept", async () => {
    const concepts = [
      concept({ conceptId: "also-deprecated", status: "deprecated" }),
      concept({ conceptId: "deprecated-one", status: "deprecated" }),
    ];
    const links = [
      {
        sourceConceptId: "also-deprecated",
        targetConceptId: "deprecated-one",
        relationType: "references",
      },
    ];

    const results = await checkLifecycleConsistency(ir(concepts, links));
    const dependencyCheck = results.find(
      (r) =>
        r.check === "no-active-depends-on-deprecated" &&
        r.target === "deprecated-one",
    );
    expect(dependencyCheck?.passed).toBe(true);
  });

  it("adds a placeholder pass when there are no concepts", async () => {
    const results = await checkLifecycleConsistency(ir([]));
    expect(results).toHaveLength(1);
    expect(results[0]?.passed).toBe(true);
  });
});
