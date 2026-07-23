import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerAgentsSyncCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  let agentsCmd = program.commands.find((c) => c.name() === "agents");
  if (!agentsCmd) {
    agentsCmd = program
      .command("agents")
      .description(
        "Manage agent instruction files (AGENTS.md, CLAUDE.md, etc)",
      );
  }

  agentsCmd
    .command("sync")
    .description(
      "Synchronize the managed context block within agent instruction files",
    )
    .action(async () => {
      const fs = await import("fs");
      const path = await import("path");
      const { syncAgentInstructions } = await import("@akcp/core");

      console.log(`[INFO] Synchronizing agent instructions...`);
      try {
        const targetDir = process.cwd();

        const filesToSync = [
          path.join(targetDir, ".agents", "AGENTS.md"),
          path.join(targetDir, "AGENTS.md"),
          path.join(targetDir, "CLAUDE.md"),
          path.join(targetDir, ".cursorrules"),
        ];

        let syncedCount = 0;
        for (const filePath of filesToSync) {
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, "utf-8");
            const newContent = syncAgentInstructions(content);
            if (content !== newContent) {
              fs.writeFileSync(filePath, newContent, "utf-8");
              console.log(`[OK] Synchronized ${path.basename(filePath)}`);
              syncedCount++;
            } else {
              console.log(
                `[INFO] ${path.basename(filePath)} is already up to date.`,
              );
            }
          }
        }

        if (syncedCount === 0) {
          console.log(
            `[INFO] No files were modified (either up-to-date or missing).`,
          );
        }
      } catch (err: any) {
        console.error(`[ERROR] Sync failed: ${err.message}`);
        process.exit(1);
      }
    });
}
