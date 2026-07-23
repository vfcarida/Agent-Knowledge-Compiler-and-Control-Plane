import type { AgentKnowledgeIR } from "./types.js";
import { runCompilerPipeline } from "../compiler/run-pipeline.js";
import type { ConnectorConfig } from "../connectors/types.js";

export interface BuildOptions {
  bundleId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  policies?: Record<string, any>;
  targets?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  capabilities?: any[];
  sources?: ConnectorConfig[];
  generateProvenance?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  privacy?: any;
}

export async function buildKnowledgeIR(
  bundlePath: string,
  options: BuildOptions = {},
): Promise<AgentKnowledgeIR> {
  return runCompilerPipeline(bundlePath, options);
}
