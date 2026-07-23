import { z } from "zod";

export const ITRunbookSchema = z.object({
  type: z.literal("Runbook"),
  id: z.string(),
  service: z.string(),
  severity: z.enum(["sev-1", "sev-2", "sev-3"]),
  lastTested: z.string(),
});

export const IncidentPostMortemSchema = z.object({
  type: z.literal("PostMortem"),
  id: z.string(),
  incidentDate: z.string(),
  rootCause: z.string(),
  actionItems: z.array(z.string()),
});
