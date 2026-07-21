import { z } from "zod";

export const SourceConfigSchema = z
  .object({
    type: z
      .enum([
        "okf-directory",
        "markdown-directory",
        "openwiki",
        "openapi",
        "mock-zendesk",
      ])
      .default("okf-directory"),
    path: z.string().optional(),
    url: z.string().optional(),
    exclude: z.array(z.string()).optional(),
  })
  .refine((data) => data.path || data.url || data.type === "mock-zendesk", {
    message: "Either 'path' or 'url' must be provided in source config",
    path: ["path"],
  });

export const TargetConfigSchema = z.object({
  type: z
    .enum([
      "mcp-resources",
      "mcp-tools",
      "mcp-prompts",
      "context-pack",
      "openwiki",
      "agent-instructions",
      "eval-dataset",
      "dashboard-metadata",
      "policy-bundle",
    ])
    .default("context-pack"),
  out: z.string().min(1).optional(),
  path: z.string().min(1).optional(),
});

export const BudgetsConfigSchema = z.object({
  maxTokens: z.number().positive().optional(),
  maxDocuments: z.number().positive().optional(),
});

export const CompileConfigSchema = z.object({
  sources: z.array(SourceConfigSchema).min(1),
  targets: z.array(TargetConfigSchema).min(1),
  budgets: BudgetsConfigSchema.optional(),
});

export const PoliciesConfigSchema = z.object({
  disableDangerousTools: z.boolean().default(true),
  requireApprovalFor: z.array(z.string()).default([]),
});

export const ProfileServerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  exportIR: z.string().optional(),
});

export const AutomationServerConfigSchema = z.object({
  enabled: z.boolean().default(false),
  exportIR: z.string().optional(),
});

export const McpConfigSchema = z.object({
  profileServer: ProfileServerConfigSchema.optional(),
  automationServer: AutomationServerConfigSchema.optional(),
});

export const EvalGateSchema = z.object({
  name: z.string().min(1),
  strict: z.boolean().default(true),
});

export const AgentIdentityConfigSchema = z.object({
  agentId: z.string(),
  policyCardName: z.string(),
});

export const AgentConfigSchema = z.object({
  id: z.string().min(1),
  allowedCapabilities: z.array(z.string()).default(["*"]),
  deniedCapabilities: z.array(z.string()).default([]),
  maxContextTokens: z.number().optional(),
  requiresApprovalFor: z.array(z.string()).default([]),
});

export const ControlPlaneConfigSchema = z.object({
  policies: PoliciesConfigSchema.optional(),
  identities: z.array(AgentIdentityConfigSchema).optional(),
  agents: z.array(AgentConfigSchema).optional(),
  mcp: McpConfigSchema.optional(),
  evalGates: z.array(EvalGateSchema).optional(),
});

export const PrivacyConfigSchema = z.object({
  defaultPiiMode: z
    .enum(["redact", "tokenize", "detect-only"])
    .default("redact"),
  allowedPiiClasses: z.array(z.string()).optional(),
  blockedPiiClasses: z.array(z.string()).optional(),
  redactionTokenFormat: z.string().optional(),
  failOnUnredactedHighRiskPii: z.boolean().default(true),
});

export const AkcpConfigSchema = z
  .object({
    akcpVersion: z.string().optional(),
    project: z.any().optional(),
    sources: z.array(SourceConfigSchema).optional(),
    compiler: z.any().optional(),
    contextBudget: BudgetsConfigSchema.optional(),
    targets: z.array(TargetConfigSchema).optional(),
    mcp: McpConfigSchema.optional(),
    policies: PoliciesConfigSchema.optional(),
    evals: z.any().optional(),
    privacy: PrivacyConfigSchema.optional(),
    compile: CompileConfigSchema.optional(),
    controlPlane: ControlPlaneConfigSchema.optional(),
  })
  .catchall(z.any());

export type AkcpConfig = z.infer<typeof AkcpConfigSchema>;
export type CompileConfig = z.infer<typeof CompileConfigSchema>;
export type ControlPlaneConfig = z.infer<typeof ControlPlaneConfigSchema>;
