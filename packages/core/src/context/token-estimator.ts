/**
 * @module token-estimator
 * @description A deterministic, LLM-agnostic heuristic token estimator.
 * Note: This does not use a real tokenizer (like tiktoken) to avoid heavyweight
 * dependencies in the core module. It provides a consistent baseline for budgeting.
 */

export class TokenEstimator {
  /**
   * Estimates tokens using a standard heuristic (1 token ~= 4 chars).
   */
  public static estimate(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }
}
