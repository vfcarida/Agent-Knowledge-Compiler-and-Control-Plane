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
    .option(
      "--verify-hashes",
      "Verify SHA-256 hashes of compiled targets against akcp-manifest.json",
    )
    .option(
      "-m, --manifest <path>",
      "Path to akcp-manifest.json",
      "dist/akcp-manifest.json",
    )
    .action(async (options) => {
      const path = await import("path");
      const { loadAkcpConfig, reconcile } = await import("@akcp/core");

      const isDryRun = options.dryRun !== false;
      console.log(
        `[INFO] Reconciling state (${isDryRun ? "dry-run" : "active"}${options.verifyHashes ? ", hash-verified" : ""}) using ${options.file}...`,
      );
      try {
        const configPath = path.resolve(process.cwd(), options.file);
        const config = loadAkcpConfig(configPath);
        const bundleRoot = path.dirname(configPath);

        const result = await reconcile(config, {
          dryRun: isDryRun,
          verifyHashes: Boolean(options.verifyHashes),
          manifestPath: options.manifest,
          bundleRoot,
        });
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
