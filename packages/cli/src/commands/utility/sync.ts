import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerSyncCommand(program: Command, _ctx: CLIContext): void {
  program
    .command("sync")
    .description(
      "Bidirectionally synchronize an OKF bundle directory with an OpenWiki Markdown directory",
    )
    .requiredOption("-o, --okf-dir <dir>", "Path to governed OKF sources dir")
    .requiredOption("-w, --wiki-dir <dir>", "Path to OpenWiki Markdown dir")
    .option(
      "-d, --direction <dir>",
      "Sync direction: pull, push, or bidirectional",
      "bidirectional",
    )
    .option(
      "-c, --conflict-strategy <strategy>",
      "3-way conflict resolution strategy: prefer-okf, prefer-wiki, or fail",
      "prefer-okf",
    )
    .option("--dry-run", "Simulate synchronization without modifying files")
    .option("-f, --format <fmt>", "Output format: text or json", "text")
    .action(async (options) => {
      const { syncOpenWikiBidirectional } = await import("@akcp/core");
      const direction =
        options.direction === "pull" || options.direction === "push"
          ? options.direction
          : "bidirectional";
      const conflictStrategy =
        options.conflictStrategy === "prefer-wiki" ||
        options.conflictStrategy === "fail"
          ? options.conflictStrategy
          : "prefer-okf";

      try {
        const report = await syncOpenWikiBidirectional({
          okfDir: options.okfDir,
          wikiDir: options.wikiDir,
          direction,
          conflictStrategy,
          dryRun: Boolean(options.dryRun),
        });

        if (options.format === "json") {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log(
            `[SYNC] Direction: ${report.direction} | Strategy: ${report.conflictStrategy}${report.dryRun ? " (dry-run)" : ""}`,
          );
          console.log(
            `  In-sync: ${report.summary.inSync} | Imported->OKF: ${report.summary.importedToOkf} | Exported->Wiki: ${report.summary.exportedToWiki} | Updated OKF: ${report.summary.updatedOkf} | Updated Wiki: ${report.summary.updatedWiki} | Conflicts: ${report.summary.conflicts}`,
          );
          for (const item of report.actions) {
            if (item.action !== "in-sync") {
              console.log(`  - [${item.action}] ${item.relPath}`);
            }
          }
        }

        if (!report.ok) {
          process.exit(1);
        }
      } catch (err) {
        console.error(`[ERROR] Sync failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
