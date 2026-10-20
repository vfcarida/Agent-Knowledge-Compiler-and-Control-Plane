import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerContextPlanCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  let contextCmd = program.commands.find((c) => c.name() === "context");
  if (!contextCmd) {
    contextCmd = program
      .command("context")
      .description(
        "Manage and optimize context economics (budget, compression, relevance)",
      );
  }

  contextCmd
    .command("plan")
    .description("Simulate context packing and generate an economics report")
    .option(
      "-t, --task <task>",
      "Task description for relevance scoring",
      "general task",
    )
    .option(
      "-b, --budget <tokens>",
      "Maximum tokens allowed in the budget",
      "10000",
    )
    .option("-p, --profile <profile>", "Profile schema to load", "career")
    .option(
      "-s, --strategy <strategy>",
      "Retrieval ranking strategy (lexical, hybrid)",
      "lexical",
    )
    .option(
      "-c, --config <path>",
      "Path to akcp.yaml or directory containing it",
    )
    .option("--bundle <directory>", "Directory containing akcp.yaml", ".")
    .option("-f, --format <format>", "Output format (text, json)", "text")
    .action(async (options) => {
      const fs = await import("fs");
      const path = await import("path");
      const {
        loadAkcpConfig,
        FileSystemAdapter,
        FrontmatterParser,
        OKFFileRepository,
        ContextPlanner,
      } = await import("@akcp/core");

      try {
        const configInput = options.config || options.bundle || ".";
        let targetDir = path.resolve(process.cwd(), configInput);
        let configPath = path.join(targetDir, "akcp.yaml");
        if (fs.existsSync(targetDir) && fs.statSync(targetDir).isFile()) {
          configPath = targetDir;
          targetDir = path.dirname(configPath);
        }
        const config = loadAkcpConfig(configPath);
        const sources = config.compile?.sources || [];
        const dirSource = sources.find(
          (s: any) =>
            s.type === "okf-directory" || s.type === "markdown-directory",
        );

        if (!dirSource || !dirSource.path) {
          console.error(
            "[ERROR] Context plan requires an okf-directory source in akcp.yaml",
          );
          process.exit(1);
        }

        if (options.format !== "json") {
          console.log(
            `[START] Analyzing context budget for task: "${options.task}"`,
          );
        }

        const fsAdapter = new FileSystemAdapter();
        const parser = new FrontmatterParser();
        const resolvedSourcePath = path.resolve(targetDir, dirSource.path);
        const repo = new OKFFileRepository(
          fsAdapter,
          parser,
          resolvedSourcePath,
        );
        const docs = await repo.findAll();

        const budgetTokens = parseInt(options.budget, 10);
        if (isNaN(budgetTokens)) {
          console.error("[ERROR] Budget must be a number");
          process.exit(1);
        }

        const manifest = ContextPlanner.plan(docs, {
          task: options.task,
          profile: options.profile,
          budget: { maxTokens: budgetTokens },
          mode: "balanced",
          strategy: options.strategy === "hybrid" ? "hybrid" : "lexical",
        });

        if (options.format === "json") {
          console.log(JSON.stringify(manifest, null, 2));
          return;
        }

        console.log("\n=============================================");
        console.log("         CONTEXT ECONOMICS REPORT");
        console.log("=============================================");
        console.log(`Task:             ${manifest.task}`);
        console.log(`Budget Tokens:    ${manifest.budgetTokens}`);
        console.log(`Estimated Tokens: ${manifest.totalEstimatedTokens}`);
        console.log(`Included Docs:    ${manifest.documentsIncluded.length}`);
        console.log(`Excluded Docs:    ${manifest.documentsExcluded.length}`);
        console.log("\n[INCLUDED]");

        manifest.documentsIncluded.forEach((doc: any) => {
          console.log(`  - ${doc.title} (ID: ${doc.id})`);
          console.log(
            `    Relevance: ${doc.relevance.toFixed(2)} | Tokens: ${doc.estimatedTokens}`,
          );
        });

        console.log("\n[EXCLUDED]");

        manifest.documentsExcluded.forEach((doc: any) => {
          console.log(`  - ${doc.title} (ID: ${doc.id})`);
          console.log(
            `    Relevance: ${doc.relevance.toFixed(2)} | Tokens: ${doc.estimatedTokens}`,
          );
          console.log(`    Reason: ${doc.reason}`);
        });
        console.log("=============================================\n");
      } catch (e: any) {
        console.error(`[ERROR] Context plan failed: ${e.message}`);
        process.exit(1);
      }
    });
}
