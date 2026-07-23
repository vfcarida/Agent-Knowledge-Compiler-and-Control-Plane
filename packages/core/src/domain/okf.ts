import { z } from "zod";

/**
 * Base frontmatter schema per OKF v0.1 spec §4.1.
 * Only `type` is required; other core fields are optional.
 */
export const OKFFrontmatterSchema = z
  .object({
    type: z
      .string()
      .min(1, 'The "type" field is required by OKF v0.1 spec §4.1'),
    title: z.string().optional(),
    description: z.string().optional(),
    resource: z.string().optional(),
    tags: z.array(z.string()).optional(),
    timestamp: z.string().optional(),
    schemaVersion: z.string().optional(),
    bundleVersion: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    owner: z.string().optional(),
    lastReviewedAt: z.string().optional(),
    reviewCadenceDays: z.number().int().positive().optional(),
    // Domain profiles may override this with a stricter enum.
    // Base schema accepts any string value so domain-specific statuses (e.g., "Closed", "Resolved") are valid.
    status: z.string().optional(),
    successor: z.string().optional(),
  })
  .passthrough();
