import type { AgentKnowledgeIR } from "../ir/types.js";
import type { OKFDocument } from "../domain/types.js";
import type { GraphNode, GraphEdge, KnowledgeGraphSummary } from "./types.js";
import { extractMarkdownLinks } from "./extract-links.js";

export function buildSemanticGraph(input: AgentKnowledgeIR | OKFDocument[]) {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const validConceptIds = new Set<string>();

  if (Array.isArray(input)) {
    // 1. Build Nodes from OKFDocument[]
    for (const doc of input) {
      validConceptIds.add(doc.conceptId);
      nodes.push({
        conceptId: doc.conceptId,
        type: doc.frontmatter.type || "Concept",
        byteSize: Buffer.byteLength(doc.body || "", "utf-8"),
        filePath: doc.filePath,
      });
    }

    // 2. Build Edges from frontmatter (depends_on, references) and markdown links
    for (const doc of input) {
      const fm = doc.frontmatter as Record<string, unknown>;
      const deps = Array.isArray(fm.depends_on)
        ? (fm.depends_on as string[])
        : [];
      for (const target of deps) {
        edges.push({
          sourceConceptId: doc.conceptId,
          targetConceptId: target,
          relationType: "depends_on",
          isBroken: !validConceptIds.has(target),
        });
      }

      const refs = Array.isArray(fm.references)
        ? (fm.references as string[])
        : [];
      for (const target of refs) {
        edges.push({
          sourceConceptId: doc.conceptId,
          targetConceptId: target,
          relationType: "references",
          isBroken: !validConceptIds.has(target),
        });
      }

      const mdLinks = extractMarkdownLinks(doc.conceptId, doc.body || "");
      for (const link of mdLinks) {
        edges.push({
          sourceConceptId: doc.conceptId,
          targetConceptId: link.targetConceptId,
          relationType: link.relationType,
          isBroken: !validConceptIds.has(link.targetConceptId),
        });
      }
    }
  } else {
    const ir = input;
    // 1. Build Nodes
    (ir.concepts || []).forEach((concept) => {
      validConceptIds.add(concept.conceptId);
      nodes.push({
        conceptId: concept.conceptId,
        type: concept.type,
        byteSize: concept.budget.byteSize,
        filePath: concept.source.filePath,
      });
    });

    // 2. Build Edges (from ir.links, which now includes both frontmatter and markdown links)
    if (ir.links) {
      ir.links.forEach((link) => {
        edges.push({
          sourceConceptId: link.sourceConceptId,
          targetConceptId: link.targetConceptId,
          relationType: link.relationType,
          isBroken: !validConceptIds.has(link.targetConceptId),
        });
      });
    }
  }

  // 3. Calculate Metrics
  const brokenLinks = edges.filter((e) => e.isBroken);

  const incomingCount: Record<string, number> = {};
  const outgoingCount: Record<string, number> = {};

  validConceptIds.forEach((id) => {
    incomingCount[id] = 0;
    outgoingCount[id] = 0;
  });

  edges.forEach((e) => {
    if (outgoingCount[e.sourceConceptId] !== undefined) {
      outgoingCount[e.sourceConceptId] =
        (outgoingCount[e.sourceConceptId] || 0) + 1;
    }
    if (!e.isBroken && incomingCount[e.targetConceptId] !== undefined) {
      incomingCount[e.targetConceptId] =
        (incomingCount[e.targetConceptId] || 0) + 1;
    }
  });

  const orphanedConcepts = Array.from(validConceptIds).filter(
    (id) => (incomingCount[id] || 0) === 0 && (outgoingCount[id] || 0) === 0,
  );

  const highlyConnectedConcepts = Array.from(validConceptIds)
    .filter((id) => (incomingCount[id] || 0) + (outgoingCount[id] || 0) >= 5)
    .sort(
      (a, b) =>
        (incomingCount[b] || 0) +
        (outgoingCount[b] || 0) -
        ((incomingCount[a] || 0) + (outgoingCount[a] || 0)),
    );

  const summary: KnowledgeGraphSummary = {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    brokenLinks,
    orphanedConcepts,
    highlyConnectedConcepts: highlyConnectedConcepts.slice(0, 10), // Top 10
  };

  return { nodes, edges, summary };
}
