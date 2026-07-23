import { z } from "zod";

export const CapabilityManifestSchema = z.object({
  id: z.string().min(1, "Capability ID is required"),
  name: z.string().min(1, "Capability name is required"),
  kind: z.enum(["tool", "resource", "prompt", "context-pack"]),
  version: z.string().min(1, "Version is required"),
  description: z.string().min(1, "Description is required"),
  owner: z.string().optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  sideEffectLevel: z.enum([
    "none",
    "local-read",
    "local-write",
    "external-read",
    "external-write",
    "external-submit",
  ]),
  requiredApproval: z.boolean(),
  inputSchema: z.unknown().optional(),
  outputSchema: z.unknown().optional(),
  reads: z.array(z.string()).optional(),
  writes: z.array(z.string()).optional(),
  contextBudget: z
    .object({
      typicalTokens: z.number(),
      maxTokens: z.number(),
    })
    .optional(),
  examples: z
    .array(
      z.object({
        input: z.unknown(),
        output: z.unknown(),
      }),
    )
    .optional(),
});

export type CapabilityManifest = z.infer<typeof CapabilityManifestSchema>;
