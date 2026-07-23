import type { AgentKnowledgeIR } from "../ir/types.js";
import type { GraphNode, GraphEdge, KnowledgeGraphSummary } from "./types.js";

export function buildSemanticGraph(ir: AgentKnowledgeIR) {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const validConceptIds = new Set<string>();

  // 1. Build Nodes
  ir.concepts.forEach((concept) => {
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
