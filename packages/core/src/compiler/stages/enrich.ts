import type { PipelineContext, PipelineStage } from "../pipeline.js";
import { Freshness } from "../../lifecycle/freshness.js";

export class EnrichStage implements PipelineStage {
  name = "enrich";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    for (const concept of context.concepts) {
      // Lifecycle freshness
      concept.status = Freshness.getEffectiveStatus(concept.frontmatter);
      concept.isStale = concept.status === "stale";

      // Provenance
      if (context.options.generateProvenance) {
        concept.provenance = {
          conceptId: concept.conceptId,
          sourceFile: concept.source?.filePath || "",
          sourceHash: context.sourceHashes[concept.source?.filePath || ""] || "",
          timestamp: new Date().toISOString(),
        };
      }
      
      // Auto-summarization for Context Compression
      if (!concept.frontmatter.summary && concept.body && concept.body.length > 500) {
        // Very naive extractive summary (first paragraph or first 500 chars)
        const firstParagraph = concept.body.split("\n\n").find(p => p.trim().length > 20 && !p.startsWith("#"));
        if (firstParagraph) {
          concept.frontmatter.summary = firstParagraph.substring(0, 300).trim() + (firstParagraph.length > 300 ? "..." : "");
        } else {
          concept.frontmatter.summary = concept.body.substring(0, 300).replace(/\n/g, " ").trim() + "...";
        }
      }
    }

    return context;
  }
}
