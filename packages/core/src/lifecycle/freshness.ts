import type { LifecycleMetadata, LifecycleStatus } from "./types.js";

const VALID_LIFECYCLE_STATUSES: readonly LifecycleStatus[] = [
  "active",
  "stale",
  "deprecated",
  "archived",
];

export class Freshness {
  /**
   * Determine the effective lifecycle status of a document based on its metadata.
   * If an explicit, valid lifecycle status is provided, it is returned.
   * Otherwise, if `lastReviewedAt` and `reviewCadenceDays` are provided, it calculates staleness.
   * Defaults to 'active'.
   */
  public static getEffectiveStatus(
    metadata: LifecycleMetadata,
    now: Date = new Date(),
  ): LifecycleStatus {
    // `metadata` here is a document's raw, user-authored frontmatter — a domain
    // profile can perfectly legitimately have its own unrelated `status` field
    // (e.g. a job-application document's `status: Applied`/`Interview`) that
    // collides in name with AK-IR's lifecycle status. Only trust it as a
    // lifecycle status if it's actually one of the four valid values —
    // otherwise this field would silently leak an arbitrary string into
    // AgentKnowledgeIRSchema's strict lifecycle enum and fail validation.
    if (
      metadata.status &&
      (VALID_LIFECYCLE_STATUSES as readonly string[]).includes(metadata.status)
    ) {
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
