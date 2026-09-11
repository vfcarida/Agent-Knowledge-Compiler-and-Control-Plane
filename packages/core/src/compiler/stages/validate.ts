import type { PipelineContext, PipelineStage } from "../pipeline.js";
import { z } from "zod";
import { CapabilitySchema } from "../../ir/schema.js";

/**
 * Validates config fragments that are available mid-pipeline (currently: declared
 * capabilities). The full AgentKnowledgeIR envelope doesn't exist yet at this point —
 * it's assembled in run-pipeline.ts after all stages run — so schema validation of the
 * *complete* AK-IR happens there (via AgentKnowledgeIRSchema) immediately after assembly,
 * not in this stage.
 */
const DEPENDENCY_RELATION_TYPES = new Set([
  "depends_on",
  "prerequisite",
  "requires",
  "child_of",
  "parent_of",
  "extends",
]);

/**
 * Validates compiler pipeline state mid-pipeline:
 * 1. Declared capabilities schema validation.
 * 2. Semantic graph broken link target detection.
 * 3. Directed cycle detection in prerequisite / dependency relationships.
 *
 * Full AgentKnowledgeIR envelope validation happens after all stages run in run-pipeline.ts.
 */
export class ValidateStage implements PipelineStage {
  name = "validate";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    // 1. Validate capabilities schema
    if (
      context.options.capabilities &&
      context.options.capabilities.length > 0
    ) {
      const validated = z
        .array(CapabilitySchema)
        .parse(context.options.capabilities);
      context.options.capabilities = validated;
    }

    // 2. Cross-reference link targets against concepts
    if (context.links && context.links.length > 0) {
      const knownConceptIds = new Set<string>();
      for (const concept of context.concepts) {
        knownConceptIds.add(concept.conceptId);
        if (concept.source?.filePath) {
          const normalizedPath = concept.source.filePath.replace(/\\/g, "/");
          knownConceptIds.add(normalizedPath);
          if (normalizedPath.endsWith(".md")) {
            knownConceptIds.add(normalizedPath.slice(0, -3));
          }
        }
      }

      for (const link of context.links) {
        // Skip external URLs or anchor-only targets
        if (
          link.targetConceptId.startsWith("http://") ||
          link.targetConceptId.startsWith("https://") ||
          link.targetConceptId.startsWith("#") ||
          link.targetConceptId.startsWith("mailto:")
        ) {
          continue;
        }

        if (!knownConceptIds.has(link.targetConceptId)) {
          context.warnings.push({
            type: "missing_link_target",
            message: `Link from concept '${link.sourceConceptId}' targets nonexistent concept '${link.targetConceptId}'`,
            source: link.sourceConceptId,
          });

          if (context.options.strict) {
            throw new Error(
              `[VALIDATION_ERROR] Broken link reference: concept '${link.sourceConceptId}' links to unknown concept '${link.targetConceptId}'`,
            );
          }
        }
      }

      // 3. Circular dependency detection on directed relationship links
      const adj = new Map<string, string[]>();
      for (const link of context.links) {
        if (DEPENDENCY_RELATION_TYPES.has(link.relationType.toLowerCase())) {
          const list = adj.get(link.sourceConceptId) || [];
          list.push(link.targetConceptId);
          adj.set(link.sourceConceptId, list);
        }
      }

      if (adj.size > 0) {
        const visited = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited
        const cyclesFound: string[][] = [];

        const dfs = (node: string, stack: string[]) => {
          visited.set(node, 1);
          stack.push(node);

          const neighbors = adj.get(node) || [];
          for (const next of neighbors) {
            const state = visited.get(next) || 0;
            if (state === 1) {
              const startIdx = stack.indexOf(next);
              if (startIdx !== -1) {
                cyclesFound.push([...stack.slice(startIdx), next]);
              }
            } else if (state === 0) {
              dfs(next, stack);
            }
          }

          stack.pop();
          visited.set(node, 2);
        };

        for (const node of adj.keys()) {
          if ((visited.get(node) || 0) === 0) {
            dfs(node, []);
          }
        }

        for (const cycle of cyclesFound) {
          const cycleStr = cycle.join(" -> ");
          context.warnings.push({
            type: "circular_dependency",
            message: `Circular dependency detected in knowledge graph: ${cycleStr}`,
            source: cycle[0],
          });

          if (context.options.strict) {
            throw new Error(
              `[VALIDATION_ERROR] Circular dependency detected in knowledge graph: ${cycleStr}`,
            );
          }
        }
      }
    }

    return context;
  }
}
