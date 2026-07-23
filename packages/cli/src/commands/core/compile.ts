import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerCompileCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  program
    .command("compile")
    .description("Compile Context Packs to specified targets")
    .option(
      "-c, --config <path>",
      "Path to akcp.yaml or directory containing it",
    )
    .option(
      "--bundle <directory>",
      "Directory containing akcp.yaml (deprecated, use --config)",
    )
    .option(
      "--target <type>",
      "Specific target to compile (e.g., all, mcp-resources, mcp-tools, mcp-prompts, context-pack, openwiki, agent-instructions, eval-dataset, dashboard-metadata, policy-bundle)",
      "all",
    )
    .option(
      "--provenance",
      "Enable full cryptographic provenance tracking",
      false,
    )
    .action(async (options) => {
      const fs = await import("fs");
      const path = await import("path");
      const crypto = await import("crypto");
      const {
        loadAkcpConfig,
        buildKnowledgeIR,
        IrJsonTarget,
        OpenWikiDocsTarget,
        AgentsMdTarget,
        McpResourcesManifestTarget,
        PolicyBundleTarget,
        EvalDatasetTarget,
        DashboardMetadataTarget,
        ProvenanceManifestBuilder,
        hashConfig,
      } = await import("@akcp/core");

      const configInput = options.config || options.bundle || ".";
      console.log(
        `[INFO] Compiling context pack from ${configInput} (target: ${options.target})`,
      );
      try {
        let targetDir = path.resolve(process.cwd(), configInput);
        let configPath = path.join(targetDir, "akcp.yaml");

        // If config points directly to a file
        if (fs.existsSync(targetDir) && fs.statSync(targetDir).isFile()) {
          configPath = targetDir;
          targetDir = path.dirname(configPath);
        }

        const config = loadAkcpConfig(configPath);

        let capabilitiesPath = path.join(targetDir, "capabilities.json");
        if (!fs.existsSync(capabilitiesPath)) {
          capabilitiesPath = path.join(
            targetDir,
            "capabilities",
            "capabilities.json",
          );
        }
        let capabilities = [];
        if (fs.existsSync(capabilitiesPath)) {
          try {
            capabilities = JSON.parse(
              fs.readFileSync(capabilitiesPath, "utf-8"),
            );
          } catch (e) {
            console.warn(`[WARNING] Failed to parse ${capabilitiesPath}`);
          }
        }

        // 1. Build IR
        const ir = await buildKnowledgeIR(targetDir, {
          sources: config.compile?.sources,
          generateProvenance: options.provenance,
          privacy: config.privacy,
          capabilities,
        });
        const configHashStr = options.provenance ? hashConfig(config) : "none";

        const irSourceHashesStr = JSON.stringify(ir.sourceHashes || {});
        const compileRunHash = crypto
          .createHash("sha256")
          .update(configHashStr + "_" + irSourceHashesStr)
          .digest("hex");

        const manifestPath = "dist/akcp-manifest.json";
        const fullManifestPath = path.resolve(targetDir, manifestPath);
        let skipTargetGeneration = false;

        if (fs.existsSync(fullManifestPath)) {
          try {
            const oldManifest = JSON.parse(
              fs.readFileSync(fullManifestPath, "utf-8"),
            );
            if (
              oldManifest.source &&
              oldManifest.source.hash === compileRunHash
            ) {
              console.log(
                "[INFO] Intelligent Incremental Build: No changes detected in sources or config. Skipping target generation.",
              );
              skipTargetGeneration = true;
            }
          } catch (e) {
            // ignore parsing error
          }
        }

        // 2. Select targets

        let targetsToRun: any[] = config.compile?.targets || [];
        if (options.target !== "all") {
          // filter or force
          targetsToRun = (config.compile?.targets || []).filter(
            (t: any) => t.type === options.target,
          );
          if (targetsToRun.length === 0) {
            targetsToRun = [
              { type: options.target, out: `dist/${options.target}` },
            ];
          }
        }

        // 3. Execute targets
        const manifestBuilder = new ProvenanceManifestBuilder();

        // Run Conformance
        try {
          const { ConformanceRunner } = await import("@akcp/conformance");
          const profile = config.profile || "career";
          const runner = new ConformanceRunner(targetDir, profile);
          const report = await runner.run();
          manifestBuilder.setConformance({
            level: report.conformanceLevel,
            checks: report.details.map((d) => ({
              check: d.ruleId || "unknown",
              passed: d.type !== "error",
              target: d.file,
              message: d.message,
              severity: d.type,
            })),
          });

          const confOutDir = path.resolve(process.cwd(), "dist/akcp");
          if (!fs.existsSync(confOutDir)) {
            fs.mkdirSync(confOutDir, { recursive: true });
          }
          fs.writeFileSync(
            path.join(confOutDir, "conformance-report.json"),
            JSON.stringify(report, null, 2),
          );
        } catch (err: any) {
          console.warn(`[WARN] Failed to run conformance: ${err.message}`);
        }

        const targetInstances: Record<string, any> = {
          "context-pack": new IrJsonTarget(),
          openwiki: new OpenWikiDocsTarget(),
          "agent-instructions": new AgentsMdTarget(),
          "mcp-resources": new McpResourcesManifestTarget(),
          "policy-bundle": new PolicyBundleTarget(),
          "eval-dataset": new EvalDatasetTarget(),
          "dashboard-metadata": new DashboardMetadataTarget(),
        };

        if (!skipTargetGeneration) {
          for (const targetConf of targetsToRun) {
            if (["mcp-tools", "mcp-prompts"].includes(targetConf.type)) {
              manifestBuilder.addWarning(
                `[WARN] Target type '${targetConf.type}' is experimental and currently unimplemented.`,
              );
              console.warn(
                `[WARN] Target type '${targetConf.type}' is experimental and currently unimplemented.`,
              );
              continue;
            }

            const targetImpl = targetInstances[targetConf.type];
            if (targetImpl) {
              console.log(
                `[INFO] Running target: ${targetConf.type} -> ${targetConf.out}`,
              );
              const output = await targetImpl.compile(ir, targetConf);
              manifestBuilder.addOutput(output);
            } else {
              console.error(
                `[ERROR] Unsupported target type: ${targetConf.type}`,
              );
              process.exit(1);
            }
          }

          // 4. Write manifest
          await manifestBuilder.writeManifest(
            ir,
            fullManifestPath,
            compileRunHash,
            program.version() || "unknown",
            targetDir,
          );
          console.log(
            `[OK] Compilation complete. Manifest written to ${fullManifestPath}`,
          );
        }
      } catch (err: any) {
        console.error(`[ERROR] Compilation failed: ${err.message}`);
        process.exit(1);
      }
    });
}
