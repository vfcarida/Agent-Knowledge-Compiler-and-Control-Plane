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
      "Specific scenario to run (prompt-injection, retrieval-grounding, red-team)",
    )
    .option("--report", "Generate a report")
    .action(async (options) => {
      if (options.scenario === "prompt-injection") {
        const { runPromptInjectionEval } =
          await import("@akcp/evals/dist/prompt-injection-scenario.js");
        console.log(`[INFO] Running evaluation scenario: prompt-injection`);
        try {
          const result = await runPromptInjectionEval();
          if (options.report) {
            console.log("\n=== EVALUATION REPORT ===");
            console.log(`Scenario: ${result.scenario}`);
            console.log(`Total Cases: ${result.totalCases}`);
            console.log(
              `Detection Rate: ${(result.detectionRate * 100).toFixed(1)}%`,
            );
            console.log(
              `False Positive Rate: ${(result.falsePositiveRate * 100).toFixed(1)}%`,
            );
            console.log(`Passed: ${result.passed ? "YES" : "NO"}`);
            console.log("=========================\n");
          }
          process.exit(result.passed ? 0 : 1);
        } catch (err: any) {
          console.error(`[ERROR] Scenario failed: ${err.message}`);
          process.exit(1);
        }
      } else if (options.scenario === "retrieval-grounding") {
        const { runRetrievalGroundingEval } =
          await import("@akcp/evals/dist/retrieval-grounding.js");
        console.log(`[INFO] Running evaluation scenario: retrieval-grounding`);
        try {
          const result = await runRetrievalGroundingEval();
          if (options.report) {
            console.log("\n=== EVALUATION REPORT ===");
            console.log(`Scenario: ${result.scenario}`);
            console.log(`Total Queries: ${result.totalQueries}`);
            console.log(
              `Mean Precision@k: ${(result.meanPrecisionAtK * 100).toFixed(1)}%`,
            );
            console.log(
              `Mean Recall@k: ${(result.meanRecallAtK * 100).toFixed(1)}%`,
            );
            console.log(`Hit Rate: ${(result.hitRate * 100).toFixed(1)}%`);
            console.log(`Passed: ${result.passed ? "YES" : "NO"}`);
            console.log("=========================\n");
          }
          process.exit(result.passed ? 0 : 1);
        } catch (err: any) {
          console.error(`[ERROR] Scenario failed: ${err.message}`);
          process.exit(1);
        }
      } else if (options.scenario === "red-team") {
        const { runAdversarialRedTeamSuite } = await import("@akcp/core");
        console.log(`[INFO] Running evaluation scenario: red-team`);
        try {
          const result = await runAdversarialRedTeamSuite();
          if (options.report) {
            console.log("\n=== EVALUATION REPORT ===");
            console.log(`Scenario: ${result.scenario}`);
            console.log(`Total Vectors: ${result.totalVectors}`);
            console.log(`Defended Vectors: ${result.defendedVectors}`);
            console.log(`Breached Vectors: ${result.breachedVectors}`);
            console.log(
              `Resilience Score: ${(result.resilienceScore * 100).toFixed(1)}%`,
            );
            console.log(`Passed: ${result.passed ? "YES" : "NO"}`);
            console.log("=========================\n");
          }
          process.exit(result.passed ? 0 : 1);
        } catch (err: any) {
          console.error(`[ERROR] Scenario failed: ${err.message}`);
          process.exit(1);
        }
      } else {
        console.error(
          "[ERROR] Scenario not specified or unsupported. Use --scenario prompt-injection, --scenario retrieval-grounding, or --scenario red-team",
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
