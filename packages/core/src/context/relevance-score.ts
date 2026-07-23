import type { OKFDocument } from "../domain/types.js";

export class RelevanceScore {
  /**
   * Calculate deterministic relevance of a document to a given task.
   * Max score is 1.0.
   */
  public static calculate(doc: OKFDocument, task: string): number {
    if (!task) return 0.5; // Base relevance without task

    const taskLower = task.toLowerCase();
    const taskTokens = taskLower.split(/\W+/).filter((t) => t.length > 2);

    const title = (doc.frontmatter.title || "").toLowerCase();
    const type = (doc.frontmatter.type || "").toLowerCase();
    const tags: string[] = Array.isArray(doc.frontmatter.tags)
      ? doc.frontmatter.tags
      : [];

    let score = 0.3; // Baseline base score for any valid document

    // 1. Explicit Priority
    if (doc.frontmatter.priority === "high") score += 0.2;
    if (doc.frontmatter.priority === "critical") score += 0.3;

    // 2. Type Match
    if (taskLower.includes(type)) {
      score += 0.2;
    }

    // 3. Title Match
    let titleMatch = 0;
    for (const token of taskTokens) {
      if (title.includes(token)) titleMatch++;
    }
    if (taskTokens.length > 0) {
      score += (titleMatch / taskTokens.length) * 0.3;
    }

    // 4. Tags Match
    const lowerTags = tags.map((t) =>
      typeof t === "string" ? t.toLowerCase() : "",
    );
    let tagMatch = 0;
    for (const token of taskTokens) {
      if (lowerTags.some((tag) => tag.includes(token))) tagMatch++;
    }
    if (taskTokens.length > 0) {
      score += (tagMatch / taskTokens.length) * 0.2;
    }

    // Cap at 1.0
    return Math.min(score, 1.0);
  }
}
