import type { IRConcept, IRLink } from "../ir/types.js";
import type { RawKnowledgeItem } from "../connectors/types.js";
import type { BuildOptions } from "../ir/build-ir.js";
import type { CompilerWarning } from "./errors.js";
import type { PiiReportData } from "../privacy/pii-report.js";

export interface PipelineContext {
  bundlePath: string;
  options: BuildOptions;
  rawItems: RawKnowledgeItem[];
  concepts: IRConcept[];
  links: IRLink[];
  sourceHashes: Record<string, string>;
  skippedCount: number;
  warnings: CompilerWarning[];
  piiReport?: PiiReportData;
}

export interface PipelineStage {
  name: string;

  execute(context: PipelineContext): Promise<PipelineContext>;
}
