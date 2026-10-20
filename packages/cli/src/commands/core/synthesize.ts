import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerSynthesizeCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  program
    .command("synthesize <inputDir>")
    .description(
      "Autonomously synthesize governed OKF frontmatter, sensitivity classification, and semantic links from unstructured documents",
    )
    .option("-o, --out <dir>", "Output directory for synthesized OKF documents")
    .option("--no-auto-link", "Disable automatic semantic WikiLink discovery")
    .option("--dry-run", "Simulate synthesis without writing files")
    .option("-f, --format <fmt>", "Output format: text or json", "text")
    .action(async (inputDir: string, options) => {
      const { synthesizeOkfBundle } = await import("@akcp/core");

      try {
        const report = await synthesizeOkfBundle({
          inputDir,
          outputDir: options.out || inputDir,
          autoLink: options.autoLink !== false,
          dryRun: Boolean(options.dryRun),
        });

        if (options.format === "json") {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log(
            `[SYNTHESIZE] Processed ${report.documentsProcessed} document(s) | Sensitivity elevations: ${report.sensitivityElevations} | Semantic links injected: ${report.semanticLinksInjected}${report.dryRun ? " (dry-run)" : ""}`,
          );
          for (const doc of report.documents) {
            const piiNote =
              doc.detectedPiiTypes.length > 0
                ? ` [PII/Secrets: ${doc.detectedPiiTypes.join(", ")} -> ${doc.sensitivity}]`
                : ` [${doc.sensitivity}]`;
            const linkNote =
              doc.autoLinkedConcepts.length > 0
                ? ` -> links: ${doc.autoLinkedConcepts.join(", ")}`
                : "";
            console.log(
              `  - ${doc.relPath} (id: ${doc.conceptId}, type: ${doc.type}, ttl: ${doc.ttlDays}d)${piiNote}${linkNote}`,
            );
          }
        }
      } catch (err) {
        console.error(`[ERROR] Synthesis failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
