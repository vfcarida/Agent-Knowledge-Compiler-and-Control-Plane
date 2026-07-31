import { z } from "zod";

export const IRScienceBudgetSchema = z.object({
  byteSize: z.number(),
  estimatedTokens: z.number(),
});

export const IRSourceSchema = z.object({
  filePath: z.string(),
  format: z.string(),
  hash: z.string().optional(),
});

export const IRProvenanceRecordSchema = z.object({
  conceptId: z.string(),
  sourceFile: z.string(),
  sourceHash: z.string(),
  timestamp: z.string(),
});

export const IRConceptSchema = z.object({
  conceptId: z.string(),
  type: z.string(),
  source: IRSourceSchema,
  // Frontmatter keys are user/domain-defined and intentionally open-ended;
  // `unknown` (not `any`) forces consumers to narrow before use.
  frontmatter: z.record(z.string(), z.unknown()),
  body: z.string(),
  budget: IRScienceBudgetSchema,
  provenance: IRProvenanceRecordSchema.optional(),
  status: z.enum(["active", "stale", "deprecated", "archived"]).optional(),
  isStale: z.boolean().optional(),
});

export const IRLinkSchema = z.object({
  sourceConceptId: z.string(),
  targetConceptId: z.string(),
  relationType: z.string(),
});

export const IRPoliciesSchema = z
  .object({
    defaultAutonomyLevel: z.string().optional(),
    piiHandling: z.string().optional(),
  })
  // NOTE: kept as `z.any()` deliberately (not tightened to `z.unknown()` like the
  // other catchalls in this file) — several call sites (e.g. mcp-profile-server's
  // http-server.ts/index.ts/index-sse.ts) pass `{ policies: ir.policies || {} }`
  // directly as `GatewayConfig.policies: Record<string, PolicyCard>`, relying on
  // this looseness. Tightening it requires also typing those call sites properly
  // (ir.policies isn't actually a Record<string, PolicyCard> shape today), which
  // is a real pre-existing gap worth fixing but is out of scope here.
  .catchall(z.any());

export const CapabilitySchema = z.object({
  id: z.string(),
  kind: z.enum(["resource", "tool", "prompt"]),
  name: z.string(),
  description: z.string(),
  owner: z.string().optional(),
  version: z.string(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  sideEffects: z.enum([
    "none",
    "local-write",
    "external-read",
    "external-write",
    "external-submit",
  ]),
  requiresApproval: z.boolean().optional(),
  readsPII: z.boolean().optional(),
  writesPII: z.boolean().optional(),
  // JSON-Schema-shaped I/O contracts; kept as an open record of `unknown` values
  // (rather than `any`) since we don't enforce a JSON-Schema meta-schema here yet.
  inputsSchema: z.record(z.string(), z.unknown()).optional(),
  outputsSchema: z.record(z.string(), z.unknown()).optional(),
  policyRefs: z.array(z.string()).optional(),
});

export const AgentKnowledgeIRSchema = z
  .object({
    irVersion: z.string(),
    okfVersion: z.string(),
    bundleId: z.string(),
    buildId: z.string(),
    timestamp: z.string(),
    concepts: z.array(IRConceptSchema),
    links: z.array(IRLinkSchema).optional(),
    policies: IRPoliciesSchema.optional(),
    capabilities: z.array(CapabilitySchema).optional(),
    targets: z.array(z.string()).optional(),
    sourceHashes: z.record(z.string(), z.string()).optional(),
  })
  // Intentional extension point: compile targets may attach additional top-level
  // fields to the IR envelope. `unknown` still forces narrowing before use.
  .catchall(z.unknown());
