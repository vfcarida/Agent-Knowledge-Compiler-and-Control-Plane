import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerConfigValidateCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  let configCmd = program.commands.find((c) => c.name() === "config");
  if (!configCmd) {
    configCmd = program
      .command("config")
      .description("Manage AKCP configuration");
  }

  configCmd
    .command("validate")
    .description("Validate akcp.yaml configuration")
    .option("-f, --file <path>", "Path to akcp.yaml", "akcp.yaml")
    .action(async (options) => {
      const path = await import("path");
      const { loadAkcpConfig } = await import("@akcp/core");

      console.log(`[INFO] Validating config file: ${options.file}`);
      try {
        const configPath = path.resolve(process.cwd(), options.file);
        loadAkcpConfig(configPath);
        console.log(`[OK] Configuration is valid.`);
      } catch (err: any) {
        console.error(`[ERROR] Validation failed:\n${err.message}`);
        process.exit(1);
      }
    });
}
