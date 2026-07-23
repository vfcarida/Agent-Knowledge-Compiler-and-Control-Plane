import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerGraphImpactedCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  let graphCmd = program.commands.find((c) => c.name() === "graph");
  if (!graphCmd) {
    graphCmd = program
      .command("graph")
      .description("Semantic Knowledge Graph operations");
  }

  graphCmd
    .command("impacted")
    .description(
      "List all downstream concepts impacted by a change to this concept",
    )
    .requiredOption("-c, --concept <id>", "Concept ID to analyze")
    .action(async (options) => {
      const fs = await import("fs");
      const path = await import("path");

      try {
        const graphPath = path.resolve(
          process.cwd(),
          "dist/knowledge-graph.json",
        );
        if (!fs.existsSync(graphPath)) {
          console.error(
            `[ERROR] Graph not found. Run 'akcp graph build' first.`,
          );
          process.exit(1);
        }

        const graphData = JSON.parse(fs.readFileSync(graphPath, "utf-8"));
        const impacted = graphData.impactMap[options.concept] || [];

        console.log(`\n=== Impact Analysis: ${options.concept} ===`);
        if (impacted.length === 0) {
          console.log(`No downstream dependencies found. Safe to modify.`);
        } else {
          console.log(
            `Modifying this concept may impact the following ${impacted.length} downstream artifacts:`,
          );
          impacted.forEach((id: string) => console.log(`  - ${id}`));
        }
        console.log();
      } catch (err: any) {
        console.error(`[ERROR] Impact analysis failed: ${err.message}`);
        process.exit(1);
      }
    });
}
