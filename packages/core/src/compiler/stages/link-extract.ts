import type { PipelineContext, PipelineStage } from "../pipeline.js";
import type { IRLink } from "../../ir/types.js";
import { extractMarkdownLinks } from "../../graph/extract-links.js";

export class LinkExtractStage implements PipelineStage {
  name = "link-extract";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    const links: IRLink[] = [];

    for (const concept of context.concepts) {
      // Frontmatter links
      if (concept.frontmatter.links && Array.isArray(concept.frontmatter.links)) {
        for (const link of concept.frontmatter.links) {
          if (link.target) {
            links.push({
              sourceConceptId: concept.conceptId,
              targetConceptId: link.target,
              relationType: link.type || "relates_to",
            });
          }
        }
      }

      // Markdown body links
      if (concept.body) {
        const extracted = extractMarkdownLinks(concept.conceptId, concept.body);
        for (const e of extracted) {
          const exists = links.find(
            (l) =>
              l.sourceConceptId === concept.conceptId &&
              l.targetConceptId === e.targetConceptId &&
              l.relationType === e.relationType,
          );
          if (!exists) links.push({
            sourceConceptId: concept.conceptId,
            targetConceptId: e.targetConceptId,
            relationType: e.relationType,
          });
        }
      }
    }

    return { ...context, links };
  }
}
