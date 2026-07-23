import { z } from "zod";

export const PolicyMappingSchema = z.object({
  nist_ai_rmf: z.array(z.string()).optional(),
  owasp_llm: z.array(z.string()).optional(),
});

export const PolicyRuleSchema = z.object({
  effect: z.enum(["allow", "deny", "require_approval"]),
  condition: z.string().optional(),
});

export const PolicyCardSchema = z.object({
  id: z.string().optional(),
  apiVersion: z
    .literal("policy.akcp.dev/v1alpha1")
    .default("policy.akcp.dev/v1alpha1"),
  kind: z.literal("PolicyCard").default("PolicyCard"),
  metadata: z.object({
    name: z.string(),
    description: z.string().optional(),
    version: z.string().optional(),
  }).optional(),
  appliesTo: z.object({
    capabilities: z.array(z.string()).default(["*"]),
  }).optional(),
  rules: z.array(PolicyRuleSchema).optional(),
  evidence: z.object({
    required: z.array(z.string()).default([]),
  }).optional(),
  spec: z.object({
    allowedAgents: z.array(z.string()).default(["*"]),
    allowedContextPacks: z.array(z.string()).default(["*"]),
    allowedTools: z.array(z.string()).default(["*"]),
    forbiddenTools: z.array(z.string()).default([]),
    maxContextBudget: z.number().optional(),
    sideEffectRules: z
      .object({
        read: z.enum(["allow", "deny", "audit"]).default("allow"),
        write: z
          .enum(["allow", "deny", "audit", "approval"])
          .default("approval"),
        submit: z
          .enum(["allow", "deny", "audit", "approval"])
          .default("approval"),
      })
      .optional(),
    approvalRequirements: z.array(z.string()).default([]),
    evidenceRequirements: z.array(z.string()).optional(),
    piiHandling: z.enum(["deny", "redact", "allow-with-audit"]).default("deny"),
    mappings: PolicyMappingSchema.optional(),
  }).optional(),
});
