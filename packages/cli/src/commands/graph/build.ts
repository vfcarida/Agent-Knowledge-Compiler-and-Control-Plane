import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerGraphBuildCommand(
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
    .command("build")
    .description("Build the knowledge graph from the OKF bundle")
    .option(
      "--bundle <directory>",
      "Directory containing akcp.yaml or okf bundle",
      ".",
    )
    .action(async (options) => {
      const path = await import("path");
      const { loadAkcpConfig, buildKnowledgeIR, GraphJsonTarget } =
        await import("@akcp/core");

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

        console.log(`[INFO] Building Knowledge Graph from ${targetDir}`);
        const ir = await buildKnowledgeIR(targetDir, {
          sources: config.compile?.sources,
        });

        const targetImpl = new GraphJsonTarget();
        const output = await targetImpl.compile(ir, {
          type: "graph-json",
          out: "dist/knowledge-graph.json",
        });

        console.log(`[OK] Graph generated at ${output.outputPath}`);
      } catch (err: any) {
        console.error(`[ERROR] Graph build failed: ${err.message}`);
        process.exit(1);
      }
    });
}
