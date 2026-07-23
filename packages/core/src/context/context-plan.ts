import type { OKFDocument } from "../domain/types.js";
import type { ContextBudget } from "./budget.js";
import type { ContextPackManifest } from "./context-pack-manifest.js";
import { TokenEstimator } from "./token-estimator.js";
import { RelevanceScore } from "./relevance-score.js";
import { chunkMarkdown } from "./markdown-chunker.js";

export interface ContextPlanOptions {
  task: string;
  profile?: string;
  budget: ContextBudget;
  mode?: "minimal" | "balanced" | "full" | "audit";
}

export class ContextPlanner {
  public static plan(
    documents: OKFDocument[],
    options: ContextPlanOptions,
  ): ContextPackManifest {
    const manifest: ContextPackManifest = {
      profile: options.profile || "default",
      task: options.task,
      budgetTokens: options.budget.maxTokens,
      totalEstimatedTokens: 0,
      documentsIncluded: [],
      documentsExcluded: [],
      generatedAt: new Date().toISOString(),
    };

    // 1. Score all documents deterministically
    const scoredDocs = documents
      .map((doc) => {
        const relevance = RelevanceScore.calculate(doc, options.task);

        // Calculate token cost for this document based on the requested mode
        let contentToEstimate = "";
        const fmStr = JSON.stringify(doc.frontmatter, null, 2);

        if (options.mode === "minimal") {
          contentToEstimate = `---\n${fmStr}\n---`;
        } else if (options.mode === "balanced") {
          const truncatedBody = chunkMarkdown(doc.body, 1500); // 1500 chars limit for balanced
          contentToEstimate = `---\n${fmStr}\n---\n\n${truncatedBody}`;
        } else {
          contentToEstimate = `---\n${fmStr}\n---\n\n${doc.body}`;
        }

        const estimatedTokens = TokenEstimator.estimate(contentToEstimate);

        return {
          doc,
          relevance,
          estimatedTokens,
        };
      })
      .sort((a, b) => b.relevance - a.relevance);

    // 2. Build the plan by adding documents until budget is reached
    for (const item of scoredDocs) {
      if (
        manifest.totalEstimatedTokens + item.estimatedTokens >
        manifest.budgetTokens
      ) {
        manifest.documentsExcluded.push({
          id: item.doc.conceptId,
          title: item.doc.frontmatter.title || item.doc.conceptId,
          relevance: item.relevance,
          estimatedTokens: item.estimatedTokens,
          reason: `Budget Exceeded (Current: ${manifest.totalEstimatedTokens}, Item: ${item.estimatedTokens}, Max: ${manifest.budgetTokens})`,
        });
      } else if (
        options.budget.maxDocuments &&
        manifest.documentsIncluded.length >= options.budget.maxDocuments
      ) {
        manifest.documentsExcluded.push({
          id: item.doc.conceptId,
          title: item.doc.frontmatter.title || item.doc.conceptId,
          relevance: item.relevance,
          estimatedTokens: item.estimatedTokens,
          reason: `Max Documents Reached (${options.budget.maxDocuments})`,
        });
      } else {
        manifest.documentsIncluded.push({
          id: item.doc.conceptId,
          title: item.doc.frontmatter.title || item.doc.conceptId,
          relevance: item.relevance,
          estimatedTokens: item.estimatedTokens,
          reason: "Budget Allowed",
        });
        manifest.totalEstimatedTokens += item.estimatedTokens;
      }
    }

    return manifest;
  }
}
