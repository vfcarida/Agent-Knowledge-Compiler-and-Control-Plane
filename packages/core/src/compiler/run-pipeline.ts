import type { PipelineContext, PipelineStage } from "./pipeline.js";
import type { AgentKnowledgeIR, Capability } from "../ir/types.js";
import type { BuildOptions } from "../ir/build-ir.js";
import type { CompilerWarning } from "./errors.js";
import type { PiiReportData } from "../privacy/pii-report.js";
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
import { AgentKnowledgeIRSchema } from "../ir/schema.js";

const DEFAULT_STAGES: PipelineStage[] = [
  new IngestStage(),
  new NormalizeStage(),
  new PrivacyStage(),
  new EnrichStage(),
  new LinkExtractStage(),
  new ValidateStage(),
];

export interface CompilerPipelineResult {
  ir: AgentKnowledgeIR;
  skippedCount: number;
  warnings: CompilerWarning[];
  piiReport?: PiiReportData;
}

/**
 * Runs the full compiler pipeline and returns the assembled AK-IR alongside the
 * pipeline-collected stats (skipped-document count, warnings, PII report) that
 * `compile()`'s Result-based API surfaces as real `CompileStats` — see compile.ts.
 */
export async function runCompilerPipelineDetailed(
  bundlePath: string,
  options: BuildOptions = {},
  stages: PipelineStage[] = DEFAULT_STAGES,
): Promise<CompilerPipelineResult> {
  let context: PipelineContext = {
    bundlePath,
    options,
    rawItems: [],
    concepts: [],
    links: [],
    sourceHashes: {},
    skippedCount: 0,
    warnings: [],
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

  // Full AK-IR schema validation happens here, once the envelope actually exists
  // (see the doc comment on ValidateStage for why it can't happen mid-pipeline).
  const parsed = AgentKnowledgeIRSchema.safeParse(ir);
  if (!parsed.success) {
    throw new Error(
      `[VALIDATION_ERROR] AK-IR failed schema validation: ${parsed.error.message}`,
    );
  }

  LifecycleValidator.validate(ir);
  if (ir.capabilities && ir.capabilities.length > 0) {
    CapabilityValidator.validate(ir.capabilities as Capability[]);
  }

  return {
    ir,
    skippedCount: context.skippedCount,
    warnings: context.warnings,
    piiReport: context.piiReport,
  };
}

/**
 * Back-compat entry point returning just the AK-IR. Prefer `runCompilerPipelineDetailed`
 * for callers that need skipped-document/PII/warning stats (e.g. `compile()`).
 */
export async function runCompilerPipeline(
  bundlePath: string,
  options: BuildOptions = {},
  stages: PipelineStage[] = DEFAULT_STAGES,
): Promise<AgentKnowledgeIR> {
  const { ir } = await runCompilerPipelineDetailed(bundlePath, options, stages);
  return ir;
}
