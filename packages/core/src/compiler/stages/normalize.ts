import type { PipelineContext, PipelineStage } from "../pipeline.js";
import { normalizeRawItem } from "../../normalizers/normalize.js";
import { IncrementalCompiler } from "../incremental-build-state.js";
import { hashString } from "../../provenance/hash.js";
import type { AgentKnowledgeIR } from "../../ir/types.js";
import path from "path";
import fs from "fs";

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

    return { ...context, sourceHashes, skippedCount };
  }
}
