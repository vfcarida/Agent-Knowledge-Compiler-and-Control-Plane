import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerReconcileCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  program
    .command("reconcile")
    .description("Reconcile desired state with current environment")
    .option("-f, --file <path>", "Path to akcp.yaml", "akcp.yaml")
    .option("--no-dry-run", "Disable dry run and perform the actual changes")
    .action(async (options) => {
      const path = await import("path");
      const { loadAkcpConfig, reconcile } = await import("@akcp/core");

      const isDryRun = options.dryRun !== false;
      console.log(
        `[INFO] Reconciling state (${isDryRun ? "dry-run" : "active"}) using ${options.file}...`,
      );
      try {
        const configPath = path.resolve(process.cwd(), options.file);
        const config = loadAkcpConfig(configPath);

        const result = await reconcile(config, { dryRun: isDryRun });
        if (result.status === "in-sync") {
          console.log(`[OK] ${result.message}`);
        } else {
          console.warn(`[WARN] ${result.message}`);
          result.differences.forEach((d: string) => console.log(`  - ${d}`));
        }
      } catch (err: any) {
        console.error(`[ERROR] Reconcile failed:\n${err.message}`);
        process.exit(1);
      }
    });
}
