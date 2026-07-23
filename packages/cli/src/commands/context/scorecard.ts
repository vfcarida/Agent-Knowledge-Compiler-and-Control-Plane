import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerScorecardCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  program
    .command("scorecard")
    .description("Calculate Agent Knowledge Readiness Scorecard")
    .requiredOption("-b, --bundle <directory>", "Path to the context bundle")
    .option(
      "-f, --format <format>",
      "Output format (json or markdown)",
      "markdown",
    )
    .action(async (options) => {
      const fs = await import("fs");
      const path = await import("path");
      const {
        loadAkcpConfig,
        buildKnowledgeIR,
        FileSystemAdapter,
        calculateScorecard,
      } = await import("@akcp/core");
      const { formatScorecardMarkdown } =
        await import("../../formatters/markdown.js");

      try {
        const targetDir = path.resolve(process.cwd(), options.bundle);

        let config;
        try {
          config = loadAkcpConfig(path.join(targetDir, "akcp.yaml"));
        } catch (e) {
          config = {
            compile: { sources: [{ type: "okf-directory", path: targetDir }] },
          };
        }

        console.log(`[INFO] Building IR for Scorecard from ${targetDir}`);
        const ir = await buildKnowledgeIR(targetDir, {
          sources: config.compile?.sources,
        });

        // Collect raw files to pass to scorecard calculation
        const fsAdapter = new FileSystemAdapter();
        const rawPaths = await fsAdapter.listFiles(targetDir, "");
        const rawFiles = await Promise.all(
          rawPaths.map(async (p) => {
            const fullPath = path.join(targetDir, p);
            const content =
              fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()
                ? fs.readFileSync(fullPath, "utf-8")
                : "";
            return { path: p, content };
          }),
        );

        const report = calculateScorecard(ir, rawFiles);

        if (options.format === "markdown") {
          console.log(formatScorecardMarkdown(report));
        } else {
          console.log(JSON.stringify(report, null, 2));
        }
      } catch (err: any) {
        console.error(`[ERROR] Scorecard calculation failed: ${err.message}`);
        process.exit(1);
      }
    });
}
