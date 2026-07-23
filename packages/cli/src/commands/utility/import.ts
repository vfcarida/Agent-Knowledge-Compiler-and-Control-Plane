import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerImportCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  program
    .command("import")
    .description(
      "[Experimental] Import from external systems into a Context Pack",
    )
    .argument("<source>", "Source URL or path to import")
    .option("-i, --input <dir>", "Input directory", "openwiki")
    .option("-o, --output <dir>", "Output directory for context pack", ".okf")
    .option(
      "--dry-run",
      "Do not write files, just show what would be generated",
    )
    .option("--force", "Overwrite existing files without prompting")
    .action(async (source, options) => {
      const path = await import("path");
      const { importSource } = await import("@akcp/core");

      if (
        source.toLowerCase() !== "openwiki" &&
        source.toLowerCase() !== "okf"
      ) {
        console.error(
          `[ERROR] Unsupported source: ${source}. Supported sources: openwiki, okf`,
        );
        process.exit(1);
      }

      if (!options.dryRun && !options.force) {
        console.error(
          `[ERROR] Import is a destructive operation. Please provide --force to execute or --dry-run to preview.`,
        );
        process.exit(1);
      }

      console.log(
        `[INFO] Importing from ${source} (${options.input}) to ${options.output}...`,
      );
      try {
        const report = await importSource(
          source.toLowerCase() as "openwiki" | "okf",
          path.resolve(process.cwd(), options.input),
          path.resolve(process.cwd(), options.output),
          options.dryRun,
        );

        console.log(`\nImport Summary:`);
        console.log(`- Files processed: ${report.documentsImported}`);
        console.log(`- Files skipped: ${report.documentsSkipped}`);
        if (report.diagnostics.length > 0) {
          console.log(`\nDiagnostics:`);

          report.diagnostics.forEach((d: any) => {
            console.log(`  - [${d.level.toUpperCase()}] ${d.message}`);
          });
        }

        if (options.dryRun) {
          console.log(`\n[INFO] Dry run finished. No files were written.`);
        } else {
          console.log(
            `\n[OK] Import complete. Remember to instruct AGENTS.md to use this context.`,
          );
        }
      } catch (err: any) {
        console.error(`[ERROR] Import failed: ${err.message}`);
        process.exit(1);
      }
    });
}
