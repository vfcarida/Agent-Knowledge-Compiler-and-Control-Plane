import fs from "node:fs/promises";
import path from "node:path";
import type { AgentKnowledgeIR } from "../ir/types.js";
import type { BuildManifest, ArtifactProvenance, ConformanceInfo } from "./types.js";
import type { TargetOutput } from "../targets/types.js";

export class ProvenanceManifestBuilder {
  private outputs: ArtifactProvenance[] = [];
  private diagnostics: string[] = [];
  private conformance: ConformanceInfo = {
    level: "none",
    checks: [],
  };

  addOutput(output: TargetOutput) {
    this.outputs.push({
      name: output.targetType,
      status: "success",
      outputs: [output.outputPath],
      hash: output.hash,
      sizeBytes: output.bytesWritten,
    });
  }

  addWarning(warning: string) {
    this.diagnostics.push(warning);
  }

  setConformance(conformance: ConformanceInfo) {
    this.conformance = conformance;
  }

  async writeManifest(
    ir: AgentKnowledgeIR,
    manifestPath: string,
    configHash: string,
    toolVersion: string,
    bundleRoot: string = ".",
  ): Promise<void> {
    const fullPath = path.resolve(process.cwd(), manifestPath);
    const outDir = path.dirname(fullPath);

    await fs.mkdir(outDir, { recursive: true });

    const manifest: BuildManifest = {
      schemaVersion: "akcp.artifact-manifest/v1",
      buildId: ir.buildId,
      createdAt: ir.timestamp,
      source: {
        root: bundleRoot,
        config: "akcp.yaml",
        hash: configHash || ir.sourceHashes?.["akcp.yaml"] || "unknown",
      },
      compiler: {
        name: "akcp",
        version: toolVersion,
      },
      targets: this.outputs,
      diagnostics: this.diagnostics,
      conformance: this.conformance,
    };

    await fs.writeFile(fullPath, JSON.stringify(manifest, null, 2), "utf-8");
  }
}
