import { z } from 'zod';

export const IRScienceBudgetSchema = z.object({
  byteSize: z.number(),
  estimatedTokens: z.number()
});

export const IRSourceSchema = z.object({
  filePath: z.string(),
  format: z.string(),
  hash: z.string().optional()
});

export const IRProvenanceRecordSchema = z.object({
  conceptId: z.string(),
  sourceFile: z.string(),
  sourceHash: z.string(),
  timestamp: z.string()
});

export const IRConceptSchema = z.object({
  conceptId: z.string(),
  type: z.string(),
  source: IRSourceSchema,
  frontmatter: z.record(z.string(), z.any()),
  body: z.string(),
  budget: IRScienceBudgetSchema,
  provenance: IRProvenanceRecordSchema.optional(),
  status: z.enum(['active', 'stale', 'deprecated', 'archived']).optional(),
  isStale: z.boolean().optional()
});

export const IRLinkSchema = z.object({
  sourceConceptId: z.string(),
  targetConceptId: z.string(),
  relationType: z.string()
});

export const IRPoliciesSchema = z.object({
  defaultAutonomyLevel: z.string().optional(),
  piiHandling: z.string().optional()
}).catchall(z.any());

export const AgentKnowledgeIRSchema = z.object({
  irVersion: z.string(),
  okfVersion: z.string(),
  bundleId: z.string(),
  buildId: z.string(),
  timestamp: z.string(),
  concepts: z.array(IRConceptSchema),
  links: z.array(IRLinkSchema).optional(),
  policies: IRPoliciesSchema.optional(),
  capabilities: z.array(z.any()).optional(),
  targets: z.array(z.string()).optional(),
  sourceHashes: z.record(z.string(), z.string()).optional()
}).catchall(z.any());
