import { describe, it, expect } from "vitest";
import { Freshness } from "../../lifecycle/freshness.js";
import type { LifecycleMetadata } from "../../lifecycle/types.js";

describe("Lifecycle Freshness", () => {
  it("should return active by default if no metadata is present", () => {
    expect(Freshness.getEffectiveStatus({})).toBe("active");
  });

  it("should respect explicit status override", () => {
    expect(Freshness.getEffectiveStatus({ status: "deprecated" })).toBe(
      "deprecated",
    );
    expect(
      Freshness.getEffectiveStatus({
        status: "archived",
        lastReviewedAt: "2000-01-01",
        reviewCadenceDays: 10,
      }),
    ).toBe("archived");
  });

  it("should calculate stale correctly based on review cadence", () => {
    const now = new Date("2024-01-01T12:00:00Z");

    // Exactly 30 days ago
    const reviewedAt = new Date("2023-12-02T12:00:00Z").toISOString();

    const metaStale: LifecycleMetadata = {
      lastReviewedAt: reviewedAt,
      reviewCadenceDays: 10, // Stale after 10 days
    };
    expect(Freshness.getEffectiveStatus(metaStale, now)).toBe("stale");

    const metaActive: LifecycleMetadata = {
      lastReviewedAt: reviewedAt,
      reviewCadenceDays: 60, // Valid for 60 days
    };
    expect(Freshness.getEffectiveStatus(metaActive, now)).toBe("active");
  });

  it("should default to active if date is invalid", () => {
    const meta: LifecycleMetadata = {
      lastReviewedAt: "invalid-date-string",
      reviewCadenceDays: 10,
    };
    expect(Freshness.getEffectiveStatus(meta)).toBe("active");
  });
});
