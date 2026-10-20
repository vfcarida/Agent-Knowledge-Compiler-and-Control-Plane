import { describe, it, expect } from "vitest";
import { evaluateEpistemicAbstention, type OKFDocument } from "../../index.js";

function makeDoc(id: string, title: string, body: string): OKFDocument {
  return {
    conceptId: id,
    filePath: `/bundle/${id}.md`,
    rawContent: body,
    body,
    frontmatter: {
      id,
      title,
      type: "guide",
      status: "active",
      tags: ["runbook"],
    },
  };
}

describe("EpistemicAbstentionGuard — Honest-by-Construction Retrieval Calibration & Contradiction Refusal", () => {
  const baseCorpus: OKFDocument[] = [
    makeDoc(
      "runbook-redis-failover",
      "Redis Cluster Failover Procedure",
      "# Redis Failover\nOperators MUST promote the replica with lowest replication lag when primary redis node fails.",
    ),
    makeDoc(
      "runbook-postgres-backup",
      "PostgreSQL Logical Backup Guide",
      "# Postgres Backup\nRun pg_dump nightly to encrypted S3 bucket.",
    ),
  ];

  it("proceeds with high calibrated confidence when query terms are grounded in the corpus", () => {
    const decision = evaluateEpistemicAbstention(
      "how to promote redis replica during cluster failover",
      baseCorpus,
    );

    expect(decision.action).toBe("PROCEED");
    expect(decision.abstained).toBe(false);
    expect(decision.confidenceScore).toBeGreaterThanOrEqual(0.5);
    expect(decision.lexicalCoverageRatio).toBeGreaterThanOrEqual(0.6);
    expect(decision.topConceptIds[0]).toContain("runbook-redis-failover");
  });

  it("abstains with ABSTAIN_INSUFFICIENT_EVIDENCE on out-of-distribution queries", () => {
    const decision = evaluateEpistemicAbstention(
      "quantum superconducting qubit decoherence calibration cryo-cmos",
      baseCorpus,
    );

    expect(decision.action).toBe("ABSTAIN_INSUFFICIENT_EVIDENCE");
    expect(decision.abstained).toBe(true);
    expect(decision.confidenceScore).toBeLessThan(0.25);
  });

  it("abstains with ABSTAIN_EPISTEMIC_CONTRADICTION when top retrieved documents contain opposing MUST vs NEVER rules", () => {
    const contradictoryCorpus: OKFDocument[] = [
      ...baseCorpus,
      makeDoc(
        "policy-redis-freeze",
        "Redis Change Freeze Policy",
        "# Redis Freeze\nOperators NEVER promote the replica with lowest replication lag during maintenance.",
      ),
    ];

    const decision = evaluateEpistemicAbstention(
      "redis replica promote lowest replication lag",
      contradictoryCorpus,
    );

    expect(decision.action).toBe("ABSTAIN_EPISTEMIC_CONTRADICTION");
    expect(decision.abstained).toBe(true);
    expect(decision.activeContradictions.length).toBeGreaterThanOrEqual(1);
    expect(decision.activeContradictions[0]?.kind).toBe("POLARITY_CONFLICT");
  });

  it("is bit-for-bit deterministic across repeated evaluations", () => {
    const run1 = evaluateEpistemicAbstention(
      "postgres backup pg_dump encrypted bucket",
      baseCorpus,
    );
    const run2 = evaluateEpistemicAbstention(
      "postgres backup pg_dump encrypted bucket",
      baseCorpus,
    );

    expect(run1).toEqual(run2);
  });
});
