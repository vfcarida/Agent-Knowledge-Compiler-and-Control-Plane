import type { AgentKnowledgeIR } from "../ir/types.js";

export class LifecycleValidator {
  /**
   * Scans the IR for dependencies on stale or deprecated concepts and logs warnings.
   */
  public static validate(ir: AgentKnowledgeIR): void {
    const conceptMap = new Map(ir.concepts.map((c) => [c.conceptId, c]));

    // 1. Report inherently stale/deprecated concepts
    for (const concept of ir.concepts) {
      if (concept.status === "stale") {
        console.warn(
          `[Lifecycle] WARNING: Concept '${concept.conceptId}' is marked as STALE. Consider reviewing it.`,
        );
      } else if (concept.status === "deprecated") {
        const successor = concept.frontmatter.successor;
        if (successor) {
          console.warn(
            `[Lifecycle] WARNING: Concept '${concept.conceptId}' is DEPRECATED. Successor: '${successor}'.`,
          );
        } else {
          console.warn(
            `[Lifecycle] WARNING: Concept '${concept.conceptId}' is DEPRECATED but has no successor defined.`,
          );
        }
      }
    }

    // 2. Report links/dependencies pointing to stale or deprecated concepts
    if (ir.links) {
      for (const link of ir.links) {
        const target = conceptMap.get(link.targetConceptId);
        if (target) {
          if (target.status === "stale") {
            console.warn(
              `[Lifecycle] WARNING: '${link.sourceConceptId}' depends on STALE concept '${link.targetConceptId}'.`,
            );
          } else if (target.status === "deprecated") {
            console.warn(
              `[Lifecycle] WARNING: '${link.sourceConceptId}' depends on DEPRECATED concept '${link.targetConceptId}'.`,
            );
          }
        }
      }
    }
  }
}
