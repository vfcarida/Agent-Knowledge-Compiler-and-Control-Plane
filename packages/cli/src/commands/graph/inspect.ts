import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerGraphInspectCommand(
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
    .command("inspect")
    .description("Inspect a concept in the knowledge graph")
    .requiredOption("-c, --concept <id>", "Concept ID to inspect")
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

        const incoming = graphData.edges.filter(
          (e: any) => e.target === options.concept,
        );
        const outgoing = graphData.edges.filter(
          (e: any) => e.source === options.concept,
        );

        console.log(`\n=== Concept: ${options.concept} ===`);
        console.log(`Outgoing Links (${outgoing.length}):`);

        outgoing.forEach((e: any) =>
          console.log(
            `  -> ${e.target} [${e.relation}] ${e.isBroken ? "(BROKEN)" : ""}`,
          ),
        );

        console.log(`\nIncoming Links (${incoming.length}):`);

        incoming.forEach((e: any) =>
          console.log(`  <- ${e.source} [${e.relation}]`),
        );
        console.log();
      } catch (err: any) {
        console.error(`[ERROR] Inspect failed: ${err.message}`);
        process.exit(1);
      }
    });
}
