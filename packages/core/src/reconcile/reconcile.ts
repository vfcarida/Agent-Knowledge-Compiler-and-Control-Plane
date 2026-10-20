import fs from "node:fs";
import path from "node:path";
import type { AkcpConfig } from "../config/akcp-config-schema.js";
import { buildKnowledgeIR } from "../ir/build-ir.js";
import { IrJsonTarget } from "../targets/ir-json.js";
import { OkfBundleTarget } from "../targets/okf-bundle.js";
import { OpenWikiDocsTarget } from "../targets/openwiki-docs.js";
import { AgentsMdTarget } from "../targets/agents-md.js";
import { McpResourcesManifestTarget } from "../targets/mcp-resources-manifest.js";
import { McpToolsManifestTarget } from "../targets/mcp-tools-manifest.js";
import { McpPromptsManifestTarget } from "../targets/mcp-prompts-manifest.js";
import { PolicyBundleTarget } from "../targets/policy-bundle.js";
import { EvalDatasetTarget } from "../targets/eval-dataset.js";
import { GraphJsonTarget } from "../targets/graph-json.js";
import { DashboardMetadataTarget } from "../targets/dashboard-metadata.js";
import { HybridIndexTarget } from "../targets/hybrid-index.js";
import { SbomCycloneDxTarget } from "../targets/sbom-cyclonedx.js";
import type { CompileTarget } from "../targets/types.js";
import { ProvenanceManifestBuilder } from "../provenance/build-manifest.js";
import { computeFileSha256 } from "../provenance/hash.js";
import type { BuildManifest } from "../provenance/types.js";

type TargetConfigItem = NonNullable<
  NonNullable<AkcpConfig["compile"]>["targets"]
>[number];

export interface ReconcileOptions {
  dryRun: boolean;
  verifyHashes?: boolean;
  manifestPath?: string;
  bundleRoot?: string;
}

export interface ReconcileResult {
  status: "in-sync" | "out-of-sync" | "error";
  differences: string[];
  driftedTargets?: string[];
  message: string;
}

function createTargetRegistry(): Record<string, CompileTarget> {
  return {
    "ir-json": new IrJsonTarget(),
    "context-pack": new IrJsonTarget(),
    "okf-bundle": new OkfBundleTarget(),
    "openwiki-docs": new OpenWikiDocsTarget(),
    openwiki: new OpenWikiDocsTarget(),
    "agents-md": new AgentsMdTarget(),
    "agent-instructions": new AgentsMdTarget(),
    "mcp-resources-manifest": new McpResourcesManifestTarget(),
    "mcp-resources": new McpResourcesManifestTarget(),
    "mcp-tools-manifest": new McpToolsManifestTarget(),
    "mcp-tools": new McpToolsManifestTarget(),
    "mcp-prompts-manifest": new McpPromptsManifestTarget(),
    "mcp-prompts": new McpPromptsManifestTarget(),
    "policy-bundle": new PolicyBundleTarget(),
    "eval-dataset": new EvalDatasetTarget(),
    "graph-json": new GraphJsonTarget(),
    "dashboard-metadata": new DashboardMetadataTarget(),
    "hybrid-index": new HybridIndexTarget(),
    "sbom-cyclonedx": new SbomCycloneDxTarget(),
  };
}

/**
 * Compares the desired state (akcp.yaml config) with the current state (filesystem),
 * optionally verifying cryptographic SHA-256 hashes against akcp-manifest.json.
 */
export async function reconcile(
  config: AkcpConfig,
  options: ReconcileOptions,
): Promise<ReconcileResult> {
  const differences: string[] = [];
  const driftedTargets: string[] = [];
  const fixesPerformed: string[] = [];
  const bundleRoot = path.resolve(options.bundleRoot || ".");

  // 1. Check sources existence
  const missingSources: string[] = [];
  for (const source of config.compile?.sources || []) {
    if (source.path) {
      const sourcePath = path.resolve(bundleRoot, source.path);
      if (!fs.existsSync(sourcePath)) {
        if (options.dryRun) {
          differences.push(
            `Source missing: Directory '${source.path}' does not exist.`,
          );
        } else {
          missingSources.push(sourcePath);
        }
      }
    }
  }

  // 2. Check target output existence
  const targetsToCompile: TargetConfigItem[] = [];
  if (config.compile?.targets) {
    for (const targetConf of config.compile.targets) {
      const outPath = targetConf.out || targetConf.path || "";
      const targetPath = path.resolve(bundleRoot, outPath);
      if (!fs.existsSync(targetPath)) {
        if (options.dryRun) {
          differences.push(
            `Target missing: Compiled output '${outPath}' does not exist.`,
          );
        } else {
          targetsToCompile.push(targetConf);
        }
      }
    }
  }

  // 3. Optional cryptographic SHA-256 drift verification against akcp-manifest.json
  if (options.verifyHashes) {
    const manifestFile = path.resolve(
      bundleRoot,
      options.manifestPath || "dist/akcp-manifest.json",
    );
    if (!fs.existsSync(manifestFile)) {
      differences.push(
        `Manifest missing: Provenance manifest '${path.relative(bundleRoot, manifestFile)}' does not exist.`,
      );
      if (!options.dryRun && config.compile?.targets) {
        for (const t of config.compile.targets) {
          if (!targetsToCompile.includes(t)) {
            targetsToCompile.push(t);
          }
        }
      }
    } else {
      try {
        const rawManifest = fs.readFileSync(manifestFile, "utf-8");
        const manifest = JSON.parse(rawManifest) as BuildManifest;
        for (const targetEntry of manifest.targets || []) {
          const firstOutput = targetEntry.outputs[0];
          if (targetEntry.hash && firstOutput) {
            const primaryOut = path.resolve(bundleRoot, firstOutput);
            if (fs.existsSync(primaryOut) && fs.statSync(primaryOut).isFile()) {
              const actualHash = computeFileSha256(primaryOut);
              if (actualHash !== targetEntry.hash) {
                const msg = `Cryptographic drift detected in '${firstOutput}': expected ${targetEntry.hash.slice(0, 12)}, found ${actualHash.slice(0, 12)}.`;
                driftedTargets.push(targetEntry.name);
                if (options.dryRun) {
                  differences.push(msg);
                } else {
                  const matchingConf = (config.compile?.targets || []).find(
                    (tc) =>
                      tc.type === targetEntry.name ||
                      (tc.out || tc.path || "").replace(/\\/g, "/") ===
                        firstOutput.replace(/\\/g, "/"),
                  );
                  if (
                    matchingConf &&
                    !targetsToCompile.includes(matchingConf)
                  ) {
                    targetsToCompile.push(matchingConf);
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        differences.push(
          `Failed to parse provenance manifest: ${(err as Error).message}`,
        );
      }
    }
  }

  // 4. Dry run semantics
  if (options.dryRun) {
    if (differences.length === 0) {
      return {
        status: "in-sync",
        differences,
        driftedTargets,
        message: "Dry run: System is in-sync with desired state.",
      };
    } else {
      return {
        status: "out-of-sync",
        differences,
        driftedTargets,
        message:
          "Dry run: System is out-of-sync. Re-compilation or environment fixes required.",
      };
    }
  }

  // 5. Mutation logic (dryRun = false)
  for (const sourcePath of missingSources) {
    fs.mkdirSync(sourcePath, { recursive: true });
    fixesPerformed.push(
      `Created missing source directory: '${path.relative(bundleRoot, sourcePath)}'`,
    );
  }

  if (targetsToCompile.length > 0) {
    const ir = await buildKnowledgeIR(bundleRoot, {
      sources: config.compile?.sources,
    });
    const manifestBuilder = new ProvenanceManifestBuilder();
    const targetInstances = createTargetRegistry();

    for (const targetConf of targetsToCompile) {
      const targetImpl = targetInstances[targetConf.type];
      if (targetImpl) {
        const outPath = path.resolve(
          bundleRoot,
          targetConf.out || targetConf.path || "",
        );
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        const output = await targetImpl.compile(ir, {
          ...targetConf,
          out: outPath,
        });
        manifestBuilder.addOutput(output);
        fixesPerformed.push(
          `Reconciled target: '${targetConf.type}' -> '${targetConf.out || targetConf.path}'`,
        );
      }
    }

    const outManifest = path.resolve(
      bundleRoot,
      options.manifestPath || "dist/akcp-manifest.json",
    );
    await manifestBuilder.writeManifest(ir, outManifest, "none", "0.1.0");
  }

  if (fixesPerformed.length === 0) {
    return {
      status: "in-sync",
      differences: [],
      driftedTargets,
      message: "System is already in-sync. No fixes needed.",
    };
  } else {
    return {
      status: "in-sync",
      differences: [],
      driftedTargets,
      message: `Reconciliation complete. Fixed issues:\n${fixesPerformed.map((f) => `  - ${f}`).join("\n")}`,
    };
  }
}
