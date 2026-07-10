import type { AgentKnowledgeIR } from '../ir/types.js';

export interface TargetConfig {
  type: string;
  out: string;
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
  compile(ir: AgentKnowledgeIR, config: TargetConfig): Promise<TargetOutput>;
}
