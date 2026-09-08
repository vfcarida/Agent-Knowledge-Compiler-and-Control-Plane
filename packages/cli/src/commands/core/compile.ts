import { Command } from "commander";
import type { CLIContext } from "../../types.js";
import { resolveIrPolicies } from "../../utils/policy.js";

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
    .option(
      "--strict",
      "Treat compiler and policy warnings as errors (exit non-zero)",
      false,
    )
    .option(
      "--force",
      "Bypass the incremental-build cache and force recompilation of all targets",
      false,
    )
    .action(async (options) => {
      const fs = await import("fs");
      const path = await import("path");
      const crypto = await import("crypto");
      const {
        loadAkcpConfig,
        compile: compileToIR,
        loadPolicy,
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

        // Validate referenced policy files early so broken policies fail fast
        const referencedPolicyPaths: string[] = (config as any).policy
          ?.policies;
        if (Array.isArray(referencedPolicyPaths)) {
          const policyErrors: string[] = [];
          for (const relPolicyPath of referencedPolicyPaths) {
            const fullPolicyPath = path.resolve(targetDir, relPolicyPath);
            try {
              loadPolicy(fullPolicyPath);
            } catch (err: any) {
              policyErrors.push(`${relPolicyPath}: ${err.message}`);
            }
          }
          if (policyErrors.length > 0) {
            console.warn(
              `[WARN] ${policyErrors.length} policy file(s) referenced in akcp.yaml failed to parse/validate:`,
            );
            for (const e of policyErrors) console.warn(`  - ${e}`);
            if (options.strict) {
              console.error(
                `[ERROR] Exiting non-zero due to --strict and the policy issue(s) above.`,
              );
              process.exit(1);
            }
          }
        }

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

        // 1. Build IR via compileToIR
        const compileResult = await compileToIR(targetDir, {
          sources: config.compile?.sources,
          generateProvenance: options.provenance,
          privacy: config.privacy,
          capabilities,
          policies: resolveIrPolicies(config),
        });

        if (!compileResult.ok) {
          console.error(`[ERROR] Compilation failed:`);
          for (const e of compileResult.error) {
            console.error(`  - [${e.type}] ${e.message}`);
          }
          process.exit(1);
        }

        const { ir, warnings } = compileResult.value;

        const frontmatterWarnings = warnings.filter(
          (w) => w.type === "frontmatter_parse_error",
        );
        if (frontmatterWarnings.length > 0) {
          console.warn(
            `[WARN] ${frontmatterWarnings.length} document(s) had malformed or invalid frontmatter and were compiled as generic untyped documents:`,
          );
          for (const w of frontmatterWarnings) {
            console.warn(`  - ${w.message}`);
          }
          if (options.strict) {
            console.error(
              `[ERROR] Exiting non-zero due to --strict and the frontmatter issue(s) above.`,
            );
            process.exit(1);
          }
        }

        const configHashStr = options.provenance ? hashConfig(config) : "none";

        const irSourceHashesStr = JSON.stringify(ir.sourceHashes || {});
        const compileRunHash = crypto
          .createHash("sha256")
          .update(configHashStr + "_" + irSourceHashesStr)
          .digest("hex");

        const manifestPath = "dist/akcp-manifest.json";
        const fullManifestPath = path.resolve(targetDir, manifestPath);
        let skipTargetGeneration = false;

        if (options.force) {
          console.log(
            "[INFO] --force set: bypassing the incremental-build cache.",
          );
        } else if (fs.existsSync(fullManifestPath)) {
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
          const runner = new ConformanceRunner(targetDir);
          const report = await runner.run();
          manifestBuilder.setConformance({
            level: report.conformanceLevel,
            checks: report.details,
          });

          const confOutDir = path.resolve(targetDir, "dist/akcp");
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
              const resolvedTargetConf = {
                ...targetConf,
                out: path.resolve(targetDir, targetConf.out),
              };
              console.log(
                `[INFO] Running target: ${targetConf.type} -> ${resolvedTargetConf.out}`,
              );
              const output = await targetImpl.compile(ir, resolvedTargetConf);
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
