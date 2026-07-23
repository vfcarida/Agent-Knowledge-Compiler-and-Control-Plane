import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerScanCommand(program: Command, _ctx: CLIContext): void {
  program
    .command("scan")
    .description("Analyze repository and suggest context document structures")
    .argument("[directory]", "Directory to scan", ".")
    .option(
      "--dry-run",
      "Do not write files, just show what would be suggested",
    )
    .option(
      "-o, --output <dir>",
      "Output directory for context pack",
      ".agent-context",
    )
    .action(async (directory, options) => {
      // fs not used
      const path = await import("path");
      const { scanWorkspace, writeScanSuggestions } =
        await import("@akcp/core");

      const targetDir = path.resolve(process.cwd(), directory);
      console.log(`[INFO] Scanning directory ${targetDir}...`);

      try {
        const result = scanWorkspace(targetDir);

        console.log(`\n=== Scan Results ===`);
        console.log(
          `Detected files/directories of interest: ${result.detectedFiles.join(", ") || "none"}`,
        );
        console.log(
          `Generated ${result.suggestions.length} suggested OKF templates:`,
        );

        result.suggestions.forEach((sug: any) => {
          console.log(
            `- [${sug.type.toUpperCase()}] ${sug.fileName}: ${sug.title}`,
          );
          console.log(`  Description: ${sug.description}`);
        });

        if (options.dryRun) {
          console.log(`\n[INFO] Dry-run enabled. No files were written.`);
        } else {
          const written = writeScanSuggestions(
            targetDir,
            result,
            options.output,
          );
          console.log(
            `\n[OK] Scan completed. Successfully wrote ${written.length} template files to ${options.output}:`,
          );
          written.forEach((f: string) =>
            console.log(`  - ${path.basename(f)}`),
          );
        }
      } catch (err: any) {
        console.error(`[ERROR] Scan failed: ${err.message}`);
        process.exit(1);
      }
    });
}
