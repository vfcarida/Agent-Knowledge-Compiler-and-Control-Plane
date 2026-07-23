import type { OKFDocument } from "../domain/types.js";
import type {
  ContextPackRequest,
  ContextPackResult,
} from "../domain/context-pack.js";
import type { AgentPolicy } from "../domain/policy.js";
import { ContextPlanner } from "../context/context-plan.js";
import { TokenEstimator } from "../context/token-estimator.js";

export class ContextPacker {
  private policy?: AgentPolicy;

  constructor(policy?: AgentPolicy) {
    this.policy = policy;
  }

  public pack(
    documents: OKFDocument[],
    request: ContextPackRequest,
  ): ContextPackResult {
    // Determine maxTokens
    const maxTokens = request.maxTokens || Number.MAX_SAFE_INTEGER;

    // Defer to ContextPlanner for deterministic scoring and budget enforcement
    const manifest = ContextPlanner.plan(documents, {
      task: request.task,
      profile: request.profile,
      budget: { maxTokens },
      mode: request.mode,
    });

    const result: ContextPackResult = {
      summary: `Context Pack generated for profile: ${request.profile} (Mode: ${request.mode})`,
      documents: [],
      omitted: [],
      totalEstimatedTokens: 0,
    };

    // Filter PII for included documents according to old policy if present
    for (const item of manifest.documentsIncluded) {
      const doc = documents.find((d) => d.conceptId === item.id);
      if (!doc) continue;

      let excerpt = "";
      const fmStr = JSON.stringify(doc.frontmatter, null, 2);

      if (request.mode === "minimal") {
        excerpt = `---\n${fmStr}\n---`;
      } else if (request.mode === "balanced") {
        const truncatedBody =
          doc.body.length > 500
            ? doc.body.substring(0, 500) + "\n...[TRUNCATED]"
            : doc.body;
        excerpt = `---\n${fmStr}\n---\n\n${truncatedBody}`;
      } else {
        excerpt = `---\n${fmStr}\n---\n\n${doc.body}`;
      }

      // PII Handling (Legacy format, typically this should be in Gateway now, but kept for ContextPack backwards compatibility)
      if (this.policy?.piiHandling === "deny") {
        const sensitiveKeys = ["email", "phone", "address", "dob"];
        const hasPii = sensitiveKeys.some(
          (key) => doc.frontmatter[key] !== undefined,
        );
        if (hasPii) {
          result.omitted.push({
            id: doc.conceptId,
            reason: "PII Handling Policy: Deny",
          });
          continue;
        }
      }

      if (this.policy?.piiHandling === "redact") {
        excerpt = excerpt.replace(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
          "[REDACTED_EMAIL]",
        );
        excerpt = excerpt.replace(
          /\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}/g,
          "[REDACTED_PHONE]",
        );
      }

      const estimatedTokens = TokenEstimator.estimate(excerpt);

      result.documents.push({
        id: doc.conceptId,
        title: doc.frontmatter.title || doc.conceptId,
        relevance: item.relevance,
        estimatedTokens,
        excerpt,
        provenance: request.includeProvenance
          ? doc.filePath
          : "provenance_omitted",
      });

      result.totalEstimatedTokens += estimatedTokens;
    }

    // Add budget-excluded documents to omitted list
    for (const item of manifest.documentsExcluded) {
      result.omitted.push({
        id: item.id,
        reason: item.reason,
      });
    }

    return result;
  }
}
