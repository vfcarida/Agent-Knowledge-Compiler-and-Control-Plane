import type { AgentKnowledgeIR } from "../ir/types.js";

export interface TargetConfig {
  type: string;
  out: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface TargetOutput {
  targetType: string;
  outputPath: string;
  hash: string;
  bytesWritten: number;
}

export interface CompileTarget {
  readonly targetType: string;
  // eslint-disable-next-line no-unused-vars
  compile(ir: AgentKnowledgeIR, config: TargetConfig): Promise<TargetOutput>;
}
