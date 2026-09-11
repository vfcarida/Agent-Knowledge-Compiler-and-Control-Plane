import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerDiffCommand(program: Command, _ctx: CLIContext): void {
  program
    .command("diff")
    .description(
      "Show semantic and governance differences between two bundles or builds",
    )
    .argument(
      "[base]",
      "Path to base bundle directory, akcp.yaml, or agent-knowledge-ir.json",
    )
    .argument(
      "[target]",
      "Path to target bundle directory, akcp.yaml, or agent-knowledge-ir.json (optional)",
    )
    .option(
      "-f, --format <type>",
      "Output format: text, json, markdown",
      "text",
    )
    .option("-o, --output <path>", "Write diff report to specified file")
    .option(
      "--strict",
      "Exit with code 1 if any breaking changes are detected",
      false,
    )
    .option(
      "--fail-on-breaking",
      "Exit with code 1 if any breaking changes are detected",
      false,
    )
    .action(async (baseInput, targetInput, options) => {
      const fs = await import("fs");
      const path = await import("path");
      const {
        compile: compileToIR,
        diffKnowledgeIR,
        formatAsText,
        formatAsJson,
        formatAsMarkdown,
        AgentKnowledgeIRSchema,
      } = await import("@akcp/core");
      type AgentKnowledgeIR = import("@akcp/core").AgentKnowledgeIR;

      const resolveToIR = async (
        inputPath: string,
      ): Promise<AgentKnowledgeIR> => {
        const resolved = path.resolve(process.cwd(), inputPath);

        if (!fs.existsSync(resolved)) {
          throw new Error(`Path does not exist: ${resolved}`);
        }

        const stat = fs.statSync(resolved);

        // Case 1: Direct JSON file
        if (stat.isFile() && resolved.endsWith(".json")) {
          const raw = JSON.parse(fs.readFileSync(resolved, "utf-8"));
          return AgentKnowledgeIRSchema.parse(raw);
        }

        // Case 2: Direct akcp.yaml file
        if (
          stat.isFile() &&
          (resolved.endsWith(".yaml") || resolved.endsWith(".yml"))
        ) {
          const bundleDir = path.dirname(resolved);
          const compileResult = await compileToIR(bundleDir);
          if (!compileResult.ok) {
            throw new Error(
              `Failed to compile ${resolved}: ${compileResult.error.map((e: any) => e.message).join("; ")}`,
            );
          }
          return compileResult.value.ir;
        }

        // Case 3: Directory
        if (stat.isDirectory()) {
          const compileResult = await compileToIR(resolved);
          if (!compileResult.ok) {
            throw new Error(
              `Failed to compile bundle at ${resolved}: ${compileResult.error.map((e: any) => e.message).join("; ")}`,
            );
          }
          return compileResult.value.ir;
        }

        throw new Error(`Unsupported input format for path: ${resolved}`);
      };

      try {
        let baseIR: AgentKnowledgeIR;
        let targetIR: AgentKnowledgeIR;

        if (baseInput && targetInput) {
          // Explicit diff between two sources
          console.log(
            `[INFO] Computing semantic diff: ${baseInput} -> ${targetInput}`,
          );
          baseIR = await resolveToIR(baseInput);
          targetIR = await resolveToIR(targetInput);
        } else {
          // Single directory diff against its existing compiled artifact
          const targetDir = baseInput || ".";
          const resolvedTargetDir = path.resolve(process.cwd(), targetDir);
          const existingArtifactPath = path.join(
            resolvedTargetDir,
            "dist",
            "agent-knowledge-ir.json",
          );

          if (fs.existsSync(existingArtifactPath)) {
            console.log(
              `[INFO] Comparing current bundle (${targetDir}) against previous build (${existingArtifactPath})`,
            );
            baseIR = AgentKnowledgeIRSchema.parse(
              JSON.parse(fs.readFileSync(existingArtifactPath, "utf-8")),
            );
          } else {
            console.log(
              `[INFO] No previous build found at dist/agent-knowledge-ir.json. Diffing current bundle (${targetDir}) against empty baseline.`,
            );
            baseIR = {
              irVersion: "0.1.0",
              okfVersion: "0.1.0",
              bundleId: "baseline-empty",
              buildId: "baseline-0",
              timestamp: new Date().toISOString(),
              concepts: [],
              links: [],
              policies: {
                defaultAutonomyLevel: "read-only",
                disableDangerousTools: true,
              },
              capabilities: [],
            };
          }

          targetIR = await resolveToIR(targetDir);
        }

        const diffResult = diffKnowledgeIR(baseIR, targetIR);

        let outputContent: string;
        const format = (options.format || "text").toLowerCase();

        switch (format) {
          case "json":
            outputContent = formatAsJson(diffResult);
            break;
          case "markdown":
          case "md":
            outputContent = formatAsMarkdown(diffResult);
            break;
          case "text":
          default:
            outputContent = formatAsText(diffResult);
            break;
        }

        if (options.output) {
          const outputPath = path.resolve(process.cwd(), options.output);
          fs.writeFileSync(outputPath, outputContent, "utf-8");
          console.log(`[OK] Diff report written to ${outputPath}`);
        } else {
          console.log(outputContent);
        }

        const shouldFailOnBreaking = options.strict || options.failOnBreaking;
        if (shouldFailOnBreaking && diffResult.isBreaking) {
          console.error(
            `\n[ERROR] Breaking governance changes detected in diff. Exiting with status code 1.`,
          );
          process.exit(1);
        }
      } catch (err: any) {
        console.error(`[ERROR] Diff failed:\n${err.message}`);
        process.exit(1);
      }
    });
}
