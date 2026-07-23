import { z } from "zod";
import { OKFFrontmatterSchema } from "../okf.js";

export const ITOperationsDocumentType = {
  Service: "Service",
  System: "System",
  Runbook: "Runbook",
  Incident: "Incident",
  Alert: "Alert",
  SLO: "SLO",
  EscalationPolicy: "EscalationPolicy",
  Owner: "Owner",
  RemediationAction: "RemediationAction",
  Postmortem: "Postmortem",
  ChangeWindow: "ChangeWindow",
  Dependency: "Dependency",
} as const;

export type ITOperationsDocumentType =
  (typeof ITOperationsDocumentType)[keyof typeof ITOperationsDocumentType];

export const ITOpsServiceSchema = OKFFrontmatterSchema.extend({
  type: z.literal(ITOperationsDocumentType.Service),
  ownerRef: z.string().optional(),
  repository: z.string().url().optional(),
  tier: z.enum(["Tier 1", "Tier 2", "Tier 3", "Tier 4"]).optional(),
  dependencies: z.array(z.string()).optional(),
  systemRef: z.string().optional(),
});

export const ITOpsSystemSchema = OKFFrontmatterSchema.extend({
  type: z.literal(ITOperationsDocumentType.System),
  ownerRef: z.string().optional(),
  criticality: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
});

export const ITOpsRunbookSchema = OKFFrontmatterSchema.extend({
  type: z.literal(ITOperationsDocumentType.Runbook),
  serviceRef: z.string().optional(),
  alertRefs: z.array(z.string()).optional(),
  severity: z.enum(["SEV-1", "SEV-2", "SEV-3", "SEV-4", "SEV-5"]).optional(),
  lastTested: z.string().optional(),
});

export const ITOpsIncidentSchema = OKFFrontmatterSchema.extend({
  type: z.literal(ITOperationsDocumentType.Incident),
  severity: z.enum(["SEV-1", "SEV-2", "SEV-3", "SEV-4", "SEV-5"]),
  status: z.enum(["Investigating", "Identified", "Monitoring", "Resolved", "Closed"]),
  serviceRefs: z.array(z.string()).optional(),
  commanderRef: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export const ITOpsAlertSchema = OKFFrontmatterSchema.extend({
  type: z.literal(ITOperationsDocumentType.Alert),
  source: z.string().optional(),
  severity: z.enum(["Info", "Warning", "Critical"]).optional(),
  serviceRef: z.string().optional(),
});

export const ITOpsSLOSchema = OKFFrontmatterSchema.extend({
  type: z.literal(ITOperationsDocumentType.SLO),
  serviceRef: z.string().optional(),
  indicator: z.string().optional(),
  target: z.string().optional(), // e.g., "99.9%"
  window: z.string().optional(), // e.g., "30d"
});

export const ITOpsEscalationPolicySchema = OKFFrontmatterSchema.extend({
  type: z.literal(ITOperationsDocumentType.EscalationPolicy),
  serviceRef: z.string().optional(),
  levels: z.array(
    z.object({
      level: z.number(),
      ownerRef: z.string(),
      timeoutMinutes: z.number(),
    })
  ).optional(),
});

export const ITOpsOwnerSchema = OKFFrontmatterSchema.extend({
  type: z.literal(ITOperationsDocumentType.Owner),
  contactEmail: z.string().email().optional(),
  slackChannel: z.string().optional(),
  pagerDutySchedule: z.string().optional(),
});

export const ITOpsRemediationActionSchema = OKFFrontmatterSchema.extend({
  type: z.literal(ITOperationsDocumentType.RemediationAction),
  riskLevel: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  requiresApproval: z.boolean().optional(),
  scriptRef: z.string().optional(),
});

export const ITOpsPostmortemSchema = OKFFrontmatterSchema.extend({
  type: z.literal(ITOperationsDocumentType.Postmortem),
  incidentRef: z.string().optional(),
  rootCause: z.string().optional(),
  actionItems: z.array(z.string()).optional(),
  dateCompleted: z.string().optional(),
});

export const ITOpsChangeWindowSchema = OKFFrontmatterSchema.extend({
  type: z.literal(ITOperationsDocumentType.ChangeWindow),
  serviceRef: z.string().optional(),
  dayOfWeek: z.string().optional(),
  startTime: z.string().optional(), // e.g., "02:00 UTC"
  durationHours: z.number().optional(),
});

export const ITOpsDependencySchema = OKFFrontmatterSchema.extend({
  type: z.literal(ITOperationsDocumentType.Dependency),
  sourceRef: z.string().optional(),
  targetRef: z.string().optional(),
  isHardDependency: z.boolean().optional(),
});

export const ITOperationsDomainSchema = z.discriminatedUnion("type", [
  ITOpsServiceSchema,
  ITOpsSystemSchema,
  ITOpsRunbookSchema,
  ITOpsIncidentSchema,
  ITOpsAlertSchema,
  ITOpsSLOSchema,
  ITOpsEscalationPolicySchema,
  ITOpsOwnerSchema,
  ITOpsRemediationActionSchema,
  ITOpsPostmortemSchema,
  ITOpsChangeWindowSchema,
  ITOpsDependencySchema,
]);

export type ITOperationsDomainData = z.infer<typeof ITOperationsDomainSchema>;
