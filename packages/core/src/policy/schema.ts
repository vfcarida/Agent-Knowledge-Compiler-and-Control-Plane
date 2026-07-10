import { z } from 'zod';

export const PolicyMappingSchema = z.object({
  nist_ai_rmf: z.array(z.string()).optional(),
  owasp_llm: z.array(z.string()).optional()
});

export const PolicyCardSchema = z.object({
  apiVersion: z.literal('policy.ocf.dev/v1alpha1').default('policy.ocf.dev/v1alpha1'),
  kind: z.literal('PolicyCard').default('PolicyCard'),
  metadata: z.object({
    name: z.string(),
    description: z.string().optional(),
    version: z.string().optional()
  }),
  spec: z.object({
    allowedAgents: z.array(z.string()).default(['*']),
    allowedContextPacks: z.array(z.string()).default(['*']),
    allowedTools: z.array(z.string()).default(['*']),
    forbiddenTools: z.array(z.string()).default([]),
    maxContextBudget: z.number().optional(),
    sideEffectRules: z.object({
      read: z.enum(['allow', 'deny', 'audit']).default('allow'),
      write: z.enum(['allow', 'deny', 'audit', 'approval']).default('approval'),
      submit: z.enum(['allow', 'deny', 'audit', 'approval']).default('approval')
    }).optional(),
    approvalRequirements: z.array(z.string()).default([]),
    evidenceRequirements: z.array(z.string()).optional(),
    piiHandling: z.enum(['deny', 'redact', 'allow-with-audit']).default('deny'),
    mappings: PolicyMappingSchema.optional()
  })
});
