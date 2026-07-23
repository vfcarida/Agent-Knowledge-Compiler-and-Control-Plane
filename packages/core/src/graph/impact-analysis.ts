import type { GraphEdge, ImpactMap } from "./types.js";

/**
 * Computes the reverse dependency graph.
 * If A links to B, then B impacts A.
 * Returns a map from a ConceptId to all ConceptIds that transitively depend on it.
 */
export function computeImpactMap(edges: GraphEdge[]): ImpactMap {
  const directImpacts: Record<string, Set<string>> = {};

  // Build direct reverse edges (if A -> B, then B -> A in reverse)
  edges.forEach((edge) => {
    if (edge.isBroken) return;

    if (!directImpacts[edge.targetConceptId]) {
      directImpacts[edge.targetConceptId] = new Set<string>();
    }
    directImpacts[edge.targetConceptId]?.add(edge.sourceConceptId);
  });

  const impactMap: ImpactMap = {};

  // Compute transitive closure for each node
  for (const conceptId of Object.keys(directImpacts)) {
    const visited = new Set<string>();
    const initial = directImpacts[conceptId];
    if (!initial) continue;

    const queue = Array.from(initial);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!visited.has(current)) {
        visited.add(current);
        const impacts = directImpacts[current];
        if (impacts) {
          queue.push(...Array.from(impacts));
        }
      }
    }

    impactMap[conceptId] = Array.from(visited);
  }

  return impactMap;
}
