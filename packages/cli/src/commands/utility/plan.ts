import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerPlanCommand(program: Command, _ctx: CLIContext): void {
  program
    .command("plan")
    .description("Generate execution plan based on akcp.yaml")
    .option("-f, --file <path>", "Path to akcp.yaml", "akcp.yaml")
    .action(async (options) => {
      const path = await import("path");
      const { loadAkcpConfig, generateBuildPlan, printBuildPlan } =
        await import("@akcp/core");

      try {
        const configPath = path.resolve(process.cwd(), options.file);
        const config = loadAkcpConfig(configPath);
        const plan = generateBuildPlan(config);
        console.log(printBuildPlan(plan));
      } catch (err: any) {
        console.error(`[ERROR] Plan failed:\n${err.message}`);
        process.exit(1);
      }
    });
}
