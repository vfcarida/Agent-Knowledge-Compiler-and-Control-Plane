import type { IRConcept, IRLink } from "../ir/types.js";

export type DiffChangeType = "added" | "removed" | "modified";

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface ConceptDiff {
  conceptId: string;
  changeType: DiffChangeType;
  title?: string;
  sourceFile?: string;
  changes?: FieldChange[];
}

export interface LinkDiff {
  sourceConceptId: string;
  targetConceptId: string;
  relationType: string;
  changeType: "added" | "removed";
}

export interface PolicyDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  description: string;
  isBreaking: boolean;
}

export interface CapabilityDiff {
  capabilityId: string;
  name: string;
  changeType: DiffChangeType;
  changes?: FieldChange[];
  isBreaking: boolean;
  breakingReason?: string;
}

export interface DiffSummary {
  addedConcepts: number;
  removedConcepts: number;
  modifiedConcepts: number;
  addedLinks: number;
  removedLinks: number;
  brokenLinks: number;
  policyChanges: number;
  addedCapabilities: number;
  removedCapabilities: number;
  modifiedCapabilities: number;
  isBreaking: boolean;
}

export interface SemanticDiffResult {
  baseBundleId?: string;
  targetBundleId?: string;
  concepts: {
    added: IRConcept[];
    removed: IRConcept[];
    modified: ConceptDiff[];
  };
  links: {
    added: IRLink[];
    removed: IRLink[];
    broken: IRLink[];
  };
  policies: PolicyDiff[];
  capabilities: CapabilityDiff[];
  isBreaking: boolean;
  breakingReasons: string[];
  summary: DiffSummary;
}

export type DiffOutputFormat = "text" | "json" | "markdown";

export interface SemanticDiffOptions {
  /**
   * Whether to treat missing link targets as breaking.
   * Defaults to true.
   */
  strictLinks?: boolean;
}
