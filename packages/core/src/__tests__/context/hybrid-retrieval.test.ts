import { describe, it, expect } from "vitest";
import {
  HybridRetriever,
  embedTextDeterministic,
  cosineSimilarity,
  computeBm25Scores,
  computePersonalizedPageRank,
  reciprocalRankFusion,
} from "../../context/hybrid-retrieval.js";
import { ContextPlanner } from "../../context/context-plan.js";
import { buildSemanticGraph } from "../../graph/build-graph.js";
import type { OKFDocument } from "../../domain/types.js";

const sampleDocs: OKFDocument[] = [
  {
    conceptId: "runbook-kubernetes-oom",
    filePath: "runbooks/kubernetes-oom.md",
    frontmatter: {
      type: "Runbook",
      title: "Kubernetes OOMKilled Pod Remediation",
      tags: ["kubernetes", "memory", "oom", "incident"],
      priority: "critical",
      depends_on: ["architecture-cluster-limits"],
    },
    body: "When a Kubernetes pod terminates with exit code 137 (OOMKilled), inspect memory limits and Prometheus container_memory_working_set_bytes metrics.",
    rawContent: "",
  },
  {
    conceptId: "architecture-cluster-limits",
    filePath: "architecture/cluster-limits.md",
    frontmatter: {
      type: "Architecture",
      title: "Cluster Resource Quotas and LimitRanges",
      tags: ["kubernetes", "quotas", "governance"],
      priority: "high",
    },
    body: "Defines namespace ResourceQuotas and LimitRange defaults for CPU and memory allocation across production clusters.",
    rawContent: "",
  },
  {
    conceptId: "policy-vacation-pto",
    filePath: "policies/vacation-pto.md",
    frontmatter: {
      type: "Policy",
      title: "Employee Vacation and PTO Policy",
      tags: ["hr", "vacation", "pto"],
      priority: "low",
    },
    body: "Employees accrue paid time off monthly and should request vacation approval two weeks in advance.",
    rawContent: "",
  },
];

describe("Hybrid Retrieval Engine (BM25 + Dense Embeddings + Personalized PageRank + RRF)", () => {
  it("computes deterministic L2-normalized dense embeddings and cosine similarity", () => {
    const v1 = embedTextDeterministic("Kubernetes pod memory OOMKilled", 64);
    const v2 = embedTextDeterministic("Kubernetes pod memory OOMKilled", 64);
    const v3 = embedTextDeterministic("Employee vacation PTO request", 64);

    expect(v1).toEqual(v2);
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0, 4);
    expect(cosineSimilarity(v1, v3)).toBeLessThan(0.5);
  });

  it("ranks domain-relevant concepts and graph dependencies higher than unrelated concepts", () => {
    const ranked = HybridRetriever.rank(
      sampleDocs,
      "remediate kubernetes OOMKilled pod memory incident",
    );

    expect(ranked).toHaveLength(3);
    expect(ranked[0]?.conceptId).toBe("runbook-kubernetes-oom");
    // Connected dependency architecture-cluster-limits should rank 2nd ahead of unrelated HR policy
    expect(ranked[1]?.conceptId).toBe("architecture-cluster-limits");
    expect(ranked[2]?.conceptId).toBe("policy-vacation-pto");
    expect(ranked[0]!.rrfScore).toBeGreaterThan(ranked[2]!.rrfScore);
  });

  it("propagates relevance across graph edges via Personalized PageRank", () => {
    const graph = buildSemanticGraph(sampleDocs);
    const seeds = new Map<string, number>([
      ["runbook-kubernetes-oom", 1.0],
      ["architecture-cluster-limits", 0.0],
      ["policy-vacation-pto", 0.0],
    ]);
    const ppr = computePersonalizedPageRank(graph, seeds, 0.85, 25);
    expect(ppr.get("architecture-cluster-limits")!).toBeGreaterThan(
      ppr.get("policy-vacation-pto")!,
    );
  });

  it("fuses multiple rankings via Reciprocal Rank Fusion (RRF)", () => {
    const rrf = reciprocalRankFusion([
      ["doc-a", "doc-b", "doc-c"],
      ["doc-b", "doc-a", "doc-c"],
    ]);
    expect(rrf.get("doc-a")).toBeCloseTo(rrf.get("doc-b")!, 5);
    expect(rrf.get("doc-a")!).toBeGreaterThan(rrf.get("doc-c")!);
  });

  it("integrates with ContextPlanner when strategy is set to 'hybrid'", () => {
    const bm25Scores = computeBm25Scores(sampleDocs, "kubernetes memory oom");
    expect(bm25Scores.get("runbook-kubernetes-oom")).toBe(1);

    const manifest = ContextPlanner.plan(sampleDocs, {
      task: "kubernetes pod memory oom",
      budget: { maxTokens: 5000, maxDocuments: 2 },
      strategy: "hybrid",
    });

    expect(manifest.documentsIncluded).toHaveLength(2);
    expect(manifest.documentsIncluded[0]?.id).toBe("runbook-kubernetes-oom");
    expect(manifest.documentsExcluded[0]?.id).toBe("policy-vacation-pto");
  });
});
