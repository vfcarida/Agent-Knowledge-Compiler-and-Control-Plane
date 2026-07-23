import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerEvalsCommand(program: Command, _ctx: CLIContext): void {
  let evalsCmd = program.commands.find((c) => c.name() === "evals");
  if (!evalsCmd) {
    evalsCmd = program
      .command("evals")
      .description("Manage evaluation datasets and runs");
  }

  evalsCmd
    .option(
      "--scenario <name>",
      "Specific scenario to run (e.g., prompt-injection)",
    )
    .option("--report", "Generate a report")
    .action(async (options) => {
      const { runPromptInjectionEval } =
        await import("@akcp/evals/dist/prompt-injection-scenario.js");

      if (options.scenario === "prompt-injection") {
        console.log(`[INFO] Running evaluation scenario: prompt-injection`);
        try {
          const result = await runPromptInjectionEval();
          if (options.report) {
            console.log("\\n=== EVALUATION REPORT ===");
            console.log(`Scenario: ${result.scenario}`);
            console.log(`Total Cases: ${result.totalCases}`);
            console.log(
              `Detection Rate: ${(result.detectionRate * 100).toFixed(1)}%`,
            );
            console.log(
              `False Positive Rate: ${(result.falsePositiveRate * 100).toFixed(1)}%`,
            );
            console.log(`Passed: ${result.passed ? "✅ YES" : "❌ NO"}`);
            console.log("=========================\\n");
          }
          process.exit(result.passed ? 0 : 1);
        } catch (err: any) {
          console.error(`[ERROR] Scenario failed: ${err.message}`);
          process.exit(1);
        }
      } else {
        console.error(
          "[ERROR] Scenario not implemented or not specified. Use --scenario prompt-injection",
        );
        process.exit(1);
      }
    });

  evalsCmd
    .command("run")
    .description("Run evaluation suite")
    .requiredOption("--bundle <path>", "Path to the compiled OKF bundle")
    .action(async (options) => {
      const fs = await import("fs");
      const path = await import("path");
      const { EvalsHarness } = await import("@akcp/evals");
      const { runScenarios } = await import("@akcp/evals/dist/scenarios.js");

      console.log(
        `[INFO] Starting Evals Pipeline for bundle: ${options.bundle}`,
      );
      try {
        const harness = new EvalsHarness();
        await runScenarios(harness);

        const reportDir = path.resolve(process.cwd(), "reports");
        if (!fs.existsSync(reportDir)) {
          fs.mkdirSync(reportDir, { recursive: true });
        }
        harness.generateReport(reportDir);
      } catch (err: any) {
        console.error(`[ERROR] Evals run failed: ${err.message}`);
        process.exit(1);
      }
    });
}
