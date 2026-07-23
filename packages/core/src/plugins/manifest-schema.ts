import { z } from "zod";

export const PluginTypeSchema = z.enum([
  "source-connector",
  "normalizer",
  "compile-target",
  "policy-pack",
  "eval-pack",
  "dashboard-panel",
]);

export const PluginPermissionSchema = z.enum([
  "fs:read",
  "fs:write",
  "network:outbound",
  "network:inbound",
  "mcp:execute",
]);

export const PluginManifestSchema = z.object({
  akcpPluginVersion: z.literal("1.0.0"),
  name: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Name must be lowercase alphanumeric with dashes"),
  version: z.string(),
  description: z.string().optional(),
  type: PluginTypeSchema,
  permissions: z.array(PluginPermissionSchema).default([]),
  entrypoint: z.string().default("dist/index.js"),
  configSchema: z.record(z.any()).optional(),
  author: z.string().optional(),
});

export type PluginType = z.infer<typeof PluginTypeSchema>;
export type PluginPermission = z.infer<typeof PluginPermissionSchema>;
export type PluginManifest = z.infer<typeof PluginManifestSchema>;
