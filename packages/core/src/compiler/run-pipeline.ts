import type { PipelineContext, PipelineStage } from "./pipeline.js";
import type { AgentKnowledgeIR, Capability } from "../ir/types.js";
import type { BuildOptions } from "../ir/build-ir.js";
import { basename } from "path";
import { randomUUID } from "crypto";
import { IngestStage } from "./stages/ingest.js";
import { NormalizeStage } from "./stages/normalize.js";
import { PrivacyStage } from "./stages/privacy.js";
import { EnrichStage } from "./stages/enrich.js";
import { LinkExtractStage } from "./stages/link-extract.js";
import { ValidateStage } from "./stages/validate.js";
import { LifecycleValidator } from "../validation/lifecycle-rules.js";
import { CapabilityValidator } from "../validation/capability-rules.js";

const DEFAULT_STAGES: PipelineStage[] = [
  new IngestStage(),
  new NormalizeStage(),
  new PrivacyStage(),
  new EnrichStage(),
  new LinkExtractStage(),
  new ValidateStage(),
];

export async function runCompilerPipeline(
  bundlePath: string,
  options: BuildOptions = {},
  stages: PipelineStage[] = DEFAULT_STAGES,
): Promise<AgentKnowledgeIR> {
  let context: PipelineContext = {
    bundlePath,
    options,
    rawItems: [],
    concepts: [],
    links: [],
    sourceHashes: {},
    skippedCount: 0,
  };

  for (const stage of stages) {
    context = await stage.execute(context);
  }

  const ir: AgentKnowledgeIR = {
    irVersion: "1.0.0",
    okfVersion: "0.1.0",
    bundleId: options.bundleId || basename(bundlePath),
    buildId: `bld_${randomUUID().split("-")[0]}`,
    timestamp: new Date().toISOString(),
    concepts: context.concepts,
    links: context.links,
    policies: options.policies,
    capabilities: options.capabilities || [],
    targets: options.targets || ["mcp-profile-server", "mcp-automation-server"],
    sourceHashes: context.sourceHashes,
  };

  LifecycleValidator.validate(ir);
  if (ir.capabilities && ir.capabilities.length > 0) {
    CapabilityValidator.validate(ir.capabilities as Capability[]);
  }

  return ir;
}
