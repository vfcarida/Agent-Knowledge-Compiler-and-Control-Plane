import type { AgentKnowledgeIR, IRPolicies, Capability } from "./types.js";
import { runCompilerPipeline } from "../compiler/run-pipeline.js";
import type { ConnectorConfig } from "../connectors/types.js";
import type { PrivacyConfigInput } from "../config/akcp-config-schema.js";

export interface BuildOptions {
  bundleId?: string;
  policies?: IRPolicies;
  targets?: string[];
  capabilities?: Capability[];
  sources?: ConnectorConfig[];
  generateProvenance?: boolean;
  privacy?: PrivacyConfigInput;
}

export async function buildKnowledgeIR(
  bundlePath: string,
  options: BuildOptions = {},
): Promise<AgentKnowledgeIR> {
  return runCompilerPipeline(bundlePath, options);
}
