import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerInspectCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  program
    .command("inspect")
    .description("Inspect an AKCP compile manifest")
    .requiredOption("--artifact <path>", "Path to akcp-manifest.json")
    .action(async (options) => {
      const fs = await import("fs");
      const path = await import("path");

      try {
        const fullPath = path.resolve(process.cwd(), options.artifact);
        if (!fs.existsSync(fullPath)) {
          console.error(`[ERROR] Manifest not found: ${fullPath}`);
          process.exit(1);
        }
        const raw = fs.readFileSync(fullPath, "utf-8");
        const manifest = JSON.parse(raw);
        console.log(`\n=== AKCP Artifact Manifest ===`);
        console.log(`Version: ${manifest.version}`);
        console.log(`Build ID: ${manifest.buildId}`);
        console.log(`Bundle ID: ${manifest.bundleId}`);
        console.log(`Timestamp: ${manifest.timestamp}`);
        console.log(`\n=== Targets Generated (${manifest.targets.length}) ===`);

        manifest.targets.forEach((t: any) => {
          console.log(`- ${t.targetType}`);
          console.log(`  Output: ${t.outputPath}`);
          console.log(`  Hash:   ${t.hash}`);
          console.log(`  Size:   ${t.bytesWritten} bytes`);
        });
        console.log();
      } catch (err: any) {
        console.error(`[ERROR] Failed to inspect artifact: ${err.message}`);
        process.exit(1);
      }
    });
}
