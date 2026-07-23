import type { IRConcept, IRLink } from "../ir/types.js";
import type { RawKnowledgeItem } from "../connectors/types.js";
import type { BuildOptions } from "../ir/build-ir.js";

export interface PipelineContext {
  bundlePath: string;
  options: BuildOptions;
  rawItems: RawKnowledgeItem[];
  concepts: IRConcept[];
  links: IRLink[];
  sourceHashes: Record<string, string>;
  skippedCount: number;
}

export interface PipelineStage {
  name: string;
  // eslint-disable-next-line no-unused-vars
  execute(context: PipelineContext): Promise<PipelineContext>;
}
