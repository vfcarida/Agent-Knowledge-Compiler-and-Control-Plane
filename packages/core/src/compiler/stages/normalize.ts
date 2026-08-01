import type { PipelineContext, PipelineStage } from "../pipeline.js";
import { normalizeRawItem } from "../../normalizers/normalize.js";
import { IncrementalCompiler } from "../incremental-build-state.js";
import { hashString } from "../../provenance/hash.js";
import type { AgentKnowledgeIR } from "../../ir/types.js";
import {
  FrontmatterParser,
  hasFrontmatterAttempt,
} from "../../infrastructure/frontmatter-parser.js";
import type { CompilerWarning } from "../errors.js";
import path from "path";
import fs from "fs";

const OKF_LIKE_FORMATS = new Set([
  "okf/markdown",
  "openwiki/markdown",
  "markdown",
]);

/**
 * normalizeRawItem() silently falls back to a generic "Document" concept type
 * whenever OKF frontmatter parsing/validation fails — correct behavior for
 * genuinely plain markdown (e.g. README.md) that never declared frontmatter,
 * but previously just as silent for a file that DID attempt frontmatter and
 * got it wrong (malformed YAML, missing required `type`). Re-running the same
 * parse here (redundant but cheap) only to decide whether a warning is
 * warranted keeps normalizeRawItem's own contract/return-shape unchanged.
 */
// Per OKF v0.2, index.md/log.md are reserved structural files, not concepts —
// index.md's only permitted frontmatter is `okf_version` (see
// infrastructure/okf-version.ts), and log.md carries no frontmatter at all.
// Neither is expected to declare a concept `type`, so a missing-`type` result
// here is normal, not a mistake worth warning about (AKCP's own index.md
// convention, which does set `type: Index`, still parses and warns as usual —
// this only suppresses the warning, it doesn't change how the file compiles).
const RESERVED_STRUCTURAL_FILENAMES = new Set(["index.md", "log.md"]);

function detectFrontmatterWarning(
  item: PipelineContext["rawItems"][number],
): CompilerWarning | undefined {
  const format = item.metadata.originalFormat;
  if (!format || !OKF_LIKE_FORMATS.has(format)) return undefined;
  if (!hasFrontmatterAttempt(item.rawContent)) return undefined;

  const baseName = path.basename(item.metadata.relativePath || "");
  if (RESERVED_STRUCTURAL_FILENAMES.has(baseName)) return undefined;

  try {
    new FrontmatterParser().parse(
      item.rawContent,
      item.metadata.relativePath || "dummy.md",
      "",
    );
    return undefined;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      type: "frontmatter_parse_error",
      message: `${item.metadata.relativePath || item.sourceUri}: ${message}`,
      source: item.sourceUri,
    };
  }
}

export class NormalizeStage implements PipelineStage {
  name = "normalize";

  async execute(context: PipelineContext): Promise<PipelineContext> {
    const incrementalCompiler = new IncrementalCompiler(context.bundlePath);

    let previousIr: AgentKnowledgeIR | null = null;
    try {
      // Resolved against the bundle being compiled (not process.cwd()) so incremental
      // build correctness doesn't depend on the directory the CLI happens to be invoked from.
      const prevIrPath = path.resolve(
        context.bundlePath,
        "dist/agent-knowledge-ir.json",
      );
      if (fs.existsSync(prevIrPath)) {
        previousIr = JSON.parse(fs.readFileSync(prevIrPath, "utf-8"));
      }
    } catch {
      // Ignore cache load failures
    }

    let skippedCount = 0;
    const sourceHashes: Record<string, string> = {};
    const warnings: CompilerWarning[] = [...context.warnings];

    for (const item of context.rawItems) {
      sourceHashes[item.sourceUri] = item.contentHash;

      if (
        !incrementalCompiler.shouldCompile(item.sourceUri, item.contentHash) &&
        previousIr
      ) {
        const prevConcept = previousIr.concepts.find(
          (c) =>
            c.source.filePath === item.sourceUri ||
            c.source.filePath === item.metadata?.relativePath ||
            c.source.filePath ===
              item.metadata?.relativePath?.replace(/\\/g, "/"),
        );
        if (prevConcept) {
          skippedCount++;
          context.concepts.push(prevConcept);
          continue;
        }
      }

      const frontmatterWarning = detectFrontmatterWarning(item);
      if (frontmatterWarning) warnings.push(frontmatterWarning);

      const concept = normalizeRawItem(item);
      // artifactHash is a hash of the produced (normalized) concept, distinct from
      // the source's contentHash — previously this was mistakenly set to conceptId.
      const artifactHash = hashString(JSON.stringify(concept));
      incrementalCompiler.updateState(
        item.sourceUri,
        item.contentHash,
        artifactHash,
      );
      context.concepts.push(concept);
    }

    incrementalCompiler.saveState();

    return { ...context, sourceHashes, skippedCount, warnings };
  }
}
