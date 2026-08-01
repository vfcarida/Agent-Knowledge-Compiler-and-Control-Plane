import { z } from "zod";

/**
 * Actor identifier per OKF v0.2's "Actor convention": `<producer>/<version>`
 * (e.g. `reference_agent/gemini-2.5-pro`), `human:<id>`, or `process:<id>`.
 * Kept as a plain string rather than a regex-enforced union — the spec only
 * recommends the convention, it doesn't require conformance to it.
 */
const OkfActorSchema = z.string();

const OkfSourceSchema = z.object({
  resource: z.string(),
  id: z.string().optional(),
  title: z.string().optional(),
  author: OkfActorSchema.optional(),
  usage_count: z.number().int().optional(),
  last_modified: z.string().optional(),
});

const OkfUsageWindowSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const OkfGeneratedSchema = z.object({
  by: OkfActorSchema,
  at: z.string().optional(),
});

const OkfVerifiedEntrySchema = z.object({
  by: OkfActorSchema,
  at: z.string().optional(),
});

const OkfParameterSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean().optional(),
});

const OkfExecutorSchema = z.object({
  resource: z.string().optional(),
  receipt: z.array(z.string()).optional(),
});

const OkfAttesterSchema = z.object({
  resource: z.string().optional(),
});

/**
 * Base frontmatter schema. Combines two things that happen to share the name
 * "OKF":
 *
 * 1. Google's real Open Knowledge Format v0.2
 *    (https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
 *    — `type`, `title`, `description`, `resource`, `tags`, plus the optional
 *    provenance/trust/lifecycle/computation families below.
 * 2. AKCP's own lifecycle/governance extensions layered on top of that same
 *    foundation (`schemaVersion`, `bundleVersion`, `priority`, `owner`,
 *    `lastReviewedAt`, `reviewCadenceDays`, `successor`) — these are NOT part
 *    of Google's spec. A bundle authored purely to real OKF v0.2 won't have
 *    them, and that's fine.
 *
 * Per OKF v0.2's own conformance rule ("consumers MUST NOT reject bundles for
 * missing optional fields or unknown frontmatter keys"), this schema stays
 * `.passthrough()` and only `type` is required.
 */
export const OKFFrontmatterSchema = z
  .object({
    type: z
      .string()
      .min(1, 'The "type" field is required by OKF v0.2 spec'),
    title: z.string().optional(),
    description: z.string().optional(),
    resource: z.string().optional(),
    tags: z.array(z.string()).optional(),

    // --- Google OKF v0.2 optional families ---
    // Provenance: what this concept was derived from.
    sources: z.array(OkfSourceSchema).optional(),
    usage_window: OkfUsageWindowSchema.optional(),
    // Trust: who produced/verified this concept's content.
    generated: OkfGeneratedSchema.optional(),
    verified: z
      .union([OkfVerifiedEntrySchema, z.array(OkfVerifiedEntrySchema)])
      .optional(),
    // Lifecycle: real OKF's own staleness signal, distinct from AKCP's
    // `lastReviewedAt`/`reviewCadenceDays` freshness model below.
    stale_after: z.string().optional(),
    // Computation: only meaningful for `type: "Attested Computation"`-style
    // concepts, but validated generically here since `type` is a free string.
    runtime: z.string().optional(),
    parameters: z.array(OkfParameterSchema).optional(),
    computation: z.string().optional(),
    executor: OkfExecutorSchema.optional(),
    attester: OkfAttesterSchema.optional(),

    // --- AKCP extensions (not part of Google's OKF spec) ---
    timestamp: z.string().optional(),
    schemaVersion: z.string().optional(),
    bundleVersion: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    owner: z.string().optional(),
    lastReviewedAt: z.string().optional(),
    reviewCadenceDays: z.number().int().positive().optional(),
    // Domain profiles may override this with a stricter enum. Real OKF v0.2's
    // own `status` enum (draft|stable|deprecated) is narrower than what
    // AKCP's domain profiles need (e.g. "Closed", "Resolved"), so this stays a
    // plain string rather than enforcing Google's 3-value enum.
    status: z.string().optional(),
    successor: z.string().optional(),
  })
  .passthrough();

/**
 * Normalizes OKF v0.2's `verified` field (which may be authored as a single
 * mapping or a list) into a flat array for callers that just want to iterate.
 */
export function normalizeVerifiedEntries(
  verified: z.infer<typeof OKFFrontmatterSchema>["verified"],
): Array<{ by: string; at?: string }> {
  if (!verified) return [];
  return Array.isArray(verified) ? verified : [verified];
}
