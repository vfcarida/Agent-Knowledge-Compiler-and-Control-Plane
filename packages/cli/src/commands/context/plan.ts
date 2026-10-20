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
    .option(
      "--enforce-abstention",
      "Enforce Honest-by-Construction epistemic abstention on insufficient grounding or polarity conflicts",
      false,
    )
    .option(
      "--min-confidence <threshold>",
      "Minimum calibrated grounding confidence in [0, 1] when --enforce-abstention is active",
      "0.25",
    )
    .action(async (options) => {
      const fs = await import("fs");
      const path = await import("path");
      const {
        loadAkcpConfig,
        FileSystemAdapter,
        FrontmatterParser,
        OKFFileRepository,
        ContextPlanner,
        evaluateEpistemicAbstention,
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

        const minConf = parseFloat(options.minConfidence);
        const abstentionDecision = evaluateEpistemicAbstention(
          options.task,
          docs,
          {
            minConfidence: isNaN(minConf) ? 0.25 : minConf,
          },
        );

        const manifest = ContextPlanner.plan(docs, {
          task: options.task,
          profile: options.profile,
          budget: { maxTokens: budgetTokens },
          mode: "balanced",
          strategy: options.strategy === "hybrid" ? "hybrid" : "lexical",
        });

        const payload = options.enforceAbstention
          ? { ...manifest, epistemicAbstention: abstentionDecision }
          : manifest;

        if (options.format === "json") {
          console.log(JSON.stringify(payload, null, 2));
          if (options.enforceAbstention && abstentionDecision.abstained) {
            process.exit(1);
          }
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
        if (options.enforceAbstention) {
          console.log(
            `Abstention Gate:  ${abstentionDecision.action} (Confidence: ${abstentionDecision.confidenceScore})`,
          );
          console.log(`Rationale:        ${abstentionDecision.rationale}`);
        }
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

        if (options.enforceAbstention && abstentionDecision.abstained) {
          process.exit(1);
        }
      } catch (e: any) {
        console.error(`[ERROR] Context plan failed: ${e.message}`);
        process.exit(1);
      }
    });
}
