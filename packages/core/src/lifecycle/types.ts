export type LifecycleStatus = "active" | "stale" | "deprecated" | "archived";

export interface LifecycleMetadata {
  owner?: string;
  lastReviewedAt?: string;
  reviewCadenceDays?: number;
  status?: LifecycleStatus;
  successor?: string;
}
