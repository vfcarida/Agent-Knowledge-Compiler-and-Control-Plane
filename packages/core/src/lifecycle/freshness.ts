import type { LifecycleMetadata, LifecycleStatus } from "./types.js";

export class Freshness {
  /**
   * Determine the effective lifecycle status of a document based on its metadata.
   * If an explicit status is provided, it is returned.
   * Otherwise, if `lastReviewedAt` and `reviewCadenceDays` are provided, it calculates staleness.
   * Defaults to 'active'.
   */
  public static getEffectiveStatus(
    metadata: LifecycleMetadata,
    now: Date = new Date(),
  ): LifecycleStatus {
    if (metadata.status) {
      return metadata.status;
    }

    if (metadata.lastReviewedAt && metadata.reviewCadenceDays) {
      const reviewedAt = new Date(metadata.lastReviewedAt);
      if (isNaN(reviewedAt.getTime())) {
        return "active"; // Invalid date, assume active or let schema validation handle it
      }

      const msPerDay = 1000 * 60 * 60 * 24;
      const daysSinceReview = Math.floor(
        (now.getTime() - reviewedAt.getTime()) / msPerDay,
      );

      if (daysSinceReview > metadata.reviewCadenceDays) {
        return "stale";
      }
    }

    return "active";
  }

  public static isStale(
    metadata: LifecycleMetadata,
    now: Date = new Date(),
  ): boolean {
    return this.getEffectiveStatus(metadata, now) === "stale";
  }
}
