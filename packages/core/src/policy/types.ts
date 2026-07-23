import { z } from "zod";
import { PolicyCardSchema, PolicyMappingSchema } from "./schema.js";

export type PolicyCard = z.infer<typeof PolicyCardSchema>;
export type PolicyMapping = z.infer<typeof PolicyMappingSchema>;

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason?: string;
  requirements?: {
    approvalRequired: boolean;
    evidenceRequired: string[];
    piiHandling: "deny" | "redact" | "allow-with-audit";
  };
}
