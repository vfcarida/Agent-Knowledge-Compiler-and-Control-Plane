import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerDoctorCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  program
    .command("doctor")
    .description("Diagnose environment configuration and readiness")
    .action(async () => {
      const fs = await import("fs");
      const path = await import("path");

      console.log(`[INFO] Running AKCP Diagnostics...`);
      console.log(`- Node Version: ${process.version}`);

      // Check if MCP Server configs exist
      const cwd = process.cwd();
      const isMonorepo = fs.existsSync(path.join(cwd, "pnpm-workspace.yaml"));
      console.log(`- Monorepo structure detected: ${isMonorepo}`);

      if (isMonorepo) {
        console.log(`[OK] Your environment is akcp.`);
      } else {
        console.warn(`[WARN] Not running inside a known workspace.`);
      }
    });
}
