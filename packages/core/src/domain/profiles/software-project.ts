import { z } from "zod";
import { OKFFrontmatterSchema } from "../okf.js";

export const SoftwareProjectDocumentType = {
  ProjectOverview: "ProjectOverview",
  ArchitectureDecision: "ArchitectureDecision",
  Service: "Service",
  APIEndpoint: "APIEndpoint",
  Runbook: "Runbook",
  CodingConvention: "CodingConvention",
  Dependency: "Dependency",
  DomainConcept: "DomainConcept",
  Workflow: "Workflow",
} as const;

export type SoftwareProjectDocumentType =
  (typeof SoftwareProjectDocumentType)[keyof typeof SoftwareProjectDocumentType];

export const ProjectOverviewSchema = OKFFrontmatterSchema.extend({
  type: z.literal(SoftwareProjectDocumentType.ProjectOverview),
  repository: z.string().url().optional(),
  primaryLanguage: z.string().optional(),
});

export const ArchitectureDecisionSchema = OKFFrontmatterSchema.extend({
  type: z.literal(SoftwareProjectDocumentType.ArchitectureDecision),
  status: z.enum(["Proposed", "Accepted", "Deprecated", "Superseded"]),
  date: z.string().optional(),
  deciders: z.array(z.string()).optional(),
});

export const ServiceSchema = OKFFrontmatterSchema.extend({
  type: z.literal(SoftwareProjectDocumentType.Service),
  owner: z.string().optional(),
  language: z.string().optional(),
  repository: z.string().url().optional(),
  tier: z.enum(["Tier 1", "Tier 2", "Tier 3"]).optional(),
});

export const APIEndpointSchema = OKFFrontmatterSchema.extend({
  type: z.literal(SoftwareProjectDocumentType.APIEndpoint),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
  path: z.string(),
  authRequired: z.boolean().optional(),
});

export const RunbookSchema = OKFFrontmatterSchema.extend({
  type: z.literal(SoftwareProjectDocumentType.Runbook),
  severity: z.enum(["Low", "Medium", "High", "Critical"]),
  onCallGroup: z.string().optional(),
});

export const CodingConventionSchema = OKFFrontmatterSchema.extend({
  type: z.literal(SoftwareProjectDocumentType.CodingConvention),
  language: z.string().optional(),
  enforcedBy: z.array(z.string()).optional(), // e.g. ["eslint", "prettier"]
});

export const DependencySchema = OKFFrontmatterSchema.extend({
  type: z.literal(SoftwareProjectDocumentType.Dependency),
  version: z.string().optional(),
  license: z.string().optional(),
  critical: z.boolean().optional(),
});

export const DomainConceptSchema = OKFFrontmatterSchema.extend({
  type: z.literal(SoftwareProjectDocumentType.DomainConcept),
  relatedConcepts: z.array(z.string()).optional(),
});

export const WorkflowSchema = OKFFrontmatterSchema.extend({
  type: z.literal(SoftwareProjectDocumentType.Workflow),
  trigger: z.string().optional(),
  cron: z.string().optional(),
});

export const SoftwareProjectFrontmatterSchema = z.discriminatedUnion("type", [
  ProjectOverviewSchema,
  ArchitectureDecisionSchema,
  ServiceSchema,
  APIEndpointSchema,
  RunbookSchema,
  CodingConventionSchema,
  DependencySchema,
  DomainConceptSchema,
  WorkflowSchema,
]);
