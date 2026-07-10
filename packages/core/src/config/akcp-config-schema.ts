import { z } from 'zod';

export const SourceConfigSchema = z.object({
  type: z.enum(['okf-directory', 'markdown-directory', 'openwiki', 'openapi']).default('okf-directory'),
  path: z.string().optional(),
  url: z.string().optional(),
  exclude: z.array(z.string()).optional()
}).refine(data => data.path || data.url, {
  message: "Either 'path' or 'url' must be provided in source config",
  path: ['path']
});

export const TargetConfigSchema = z.object({
  type: z.enum(['ir-json', 'okf-bundle', 'openwiki-docs', 'agents-md', 'mcp-resources-manifest', 'policy-bundle', 'eval-dataset', 'graph-json']).default('ir-json'),
  out: z.string().min(1)
});

export const BudgetsConfigSchema = z.object({
  maxTokens: z.number().positive().optional(),
  maxDocuments: z.number().positive().optional()
});

export const CompileConfigSchema = z.object({
  sources: z.array(SourceConfigSchema).min(1),
  targets: z.array(TargetConfigSchema).min(1),
  budgets: BudgetsConfigSchema.optional()
});

export const PoliciesConfigSchema = z.object({
  disableDangerousTools: z.boolean().default(true),
  requireApprovalFor: z.array(z.string()).default([])
});

export const ProfileServerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  exportIR: z.string().optional()
});

export const AutomationServerConfigSchema = z.object({
  enabled: z.boolean().default(false),
  exportIR: z.string().optional()
});

export const McpConfigSchema = z.object({
  profileServer: ProfileServerConfigSchema.optional(),
  automationServer: AutomationServerConfigSchema.optional()
});

export const EvalGateSchema = z.object({
  name: z.string().min(1),
  strict: z.boolean().default(true)
});

export const AgentIdentityConfigSchema = z.object({
  agentId: z.string(),
  policyCardName: z.string()
});

export const ControlPlaneConfigSchema = z.object({
  policies: PoliciesConfigSchema.optional(),
  identities: z.array(AgentIdentityConfigSchema).optional(),
  mcp: McpConfigSchema.optional(),
  evalGates: z.array(EvalGateSchema).optional()
});

export const AkcpConfigSchema = z.object({
  compile: CompileConfigSchema,
  controlPlane: ControlPlaneConfigSchema.optional()
}).strict();

export type AkcpConfig = z.infer<typeof AkcpConfigSchema>;
export type CompileConfig = z.infer<typeof CompileConfigSchema>;
export type ControlPlaneConfig = z.infer<typeof ControlPlaneConfigSchema>;
