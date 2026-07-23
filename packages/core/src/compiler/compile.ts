import type { AgentKnowledgeIR } from "../ir/types.js";
import type { BuildOptions } from "../ir/build-ir.js";
import type { Result } from "../domain/result.js";
import type { CompilerError } from "./errors.js";
import { success, failure } from "../domain/result.js";
import { runCompilerPipeline } from "./run-pipeline.js";

export interface CompileResult {
  ir: AgentKnowledgeIR;
  warnings: CompilerWarning[];
  stats: CompileStats;
}

export interface CompilerWarning {
  type: "stale_document" | "unknown_source_type" | "missing_link_target" | "pii_redacted";
  message: string;
  source?: string;
}

export interface CompileStats {
  totalDocuments: number;
  skippedDocuments: number;
  compiledDocuments: number;
  linksExtracted: number;
  piiRedactions: number;
  durationMs: number;
}

/**
 * Compiles a knowledge bundle into AK-IR.
 * Returns a Result type — never throws for expected errors.
 *
 * @example
 * ```typescript
 * const result = await compile("./my-bundle", { targets: ["mcp-profile-server"] });
 * if (result.ok) {
 *   console.log(`Compiled ${result.value.stats.totalDocuments} documents`);
 * } else {
 *   console.error("Compilation failed:", result.error);
 * }
 * ```
 */
export async function compile(
  bundlePath: string,
  options: BuildOptions = {},
): Promise<Result<CompileResult, CompilerError[]>> {
  const start = Date.now();
  const warnings: CompilerWarning[] = [];
  const errors: CompilerError[] = [];

  try {
    const ir = await runCompilerPipeline(bundlePath, options);

    // Collect warnings from stale documents
    for (const concept of ir.concepts) {
      if (concept.isStale) {
        warnings.push({
          type: "stale_document",
          message: `Document '${concept.source?.filePath}' is stale`,
          source: concept.source?.filePath,
        });
      }
    }

    return success({
      ir,
      warnings,
      stats: {
        totalDocuments: ir.concepts.length,
        skippedDocuments: 0, // TODO: get from pipeline context
        compiledDocuments: ir.concepts.length,
        linksExtracted: ir.links?.length || 0,
        piiRedactions: 0, // TODO: get from privacy stage
        durationMs: Date.now() - start,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("[PII_ERROR]")) {
      errors.push({ type: "pii", message, source: "" });
    } else if (message.includes("[VALIDATION_ERROR]")) {
      errors.push({ type: "schema", message });
    } else {
      errors.push({ type: "validation", message });
    }

    return failure(errors);
  }
}
