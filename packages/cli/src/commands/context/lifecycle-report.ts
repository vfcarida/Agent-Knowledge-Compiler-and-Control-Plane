import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerLifecycleReportCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  let lifecycleCmd = program.commands.find((c) => c.name() === "lifecycle");
  if (!lifecycleCmd) {
    lifecycleCmd = program
      .command("lifecycle")
      .description(
        "Manage knowledge lifecycle (freshness, deprecation, owners)",
      );
  }

  lifecycleCmd
    .command("report")
    .description("Generate a lifecycle report (active, stale, deprecated)")
    .action(async () => {
      const path = await import("path");
      const {
        loadAkcpConfig,
        FileSystemAdapter,
        FrontmatterParser,
        OKFFileRepository,
        Freshness,
      } = await import("@akcp/core");

      try {
        const configPath = path.resolve(process.cwd(), "akcp.yaml");
        const config = loadAkcpConfig(configPath);
        const sources = config.compile?.sources || [];
        const dirSource = sources.find(
          (s: any) =>
            s.type === "okf-directory" || s.type === "markdown-directory",
        );

        if (!dirSource || !dirSource.path) {
          console.error(
            "[ERROR] Lifecycle report requires an okf-directory source in akcp.yaml",
          );
          process.exit(1);
        }

        const repo = new OKFFileRepository(
          new FileSystemAdapter(),
          new FrontmatterParser(),
          dirSource.path,
        );
        const docs = await repo.findAll();

        let active = 0;
        let stale = 0;
        let deprecated = 0;
        let archived = 0;

        const staleDocs: string[] = [];
        const deprecatedDocs: string[] = [];

        for (const doc of docs) {
          const status = Freshness.getEffectiveStatus(doc.frontmatter);
          if (status === "stale") {
            stale++;
            staleDocs.push(doc.conceptId);
          } else if (status === "deprecated") {
            deprecated++;
            deprecatedDocs.push(doc.conceptId);
          } else if (status === "archived") {
            archived++;
          } else {
            active++;
          }
        }

        console.log("\n=============================================");
        console.log("         KNOWLEDGE LIFECYCLE REPORT");
        console.log("=============================================");
        console.log(`Total Documents: ${docs.length}`);
        console.log(`Active:          ${active}`);
        console.log(`Stale:           ${stale}`);
        console.log(`Deprecated:      ${deprecated}`);
        console.log(`Archived:        ${archived}`);

        if (staleDocs.length > 0) {
          console.log("\n[STALE DOCUMENTS]");
          staleDocs.forEach((id) => console.log(`  - ${id}`));
        }

        if (deprecatedDocs.length > 0) {
          console.log("\n[DEPRECATED DOCUMENTS]");
          deprecatedDocs.forEach((id) => console.log(`  - ${id}`));
        }
        console.log("=============================================\n");
      } catch (e: any) {
        console.error(`[ERROR] Lifecycle report failed: ${e.message}`);
        process.exit(1);
      }
    });
}
