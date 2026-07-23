import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerDocsCommand(program: Command, _ctx: CLIContext): void {
  let docsCmd = program.commands.find((c) => c.name() === "docs");
  if (!docsCmd) {
    docsCmd = program
      .command("docs")
      .description("Manage and diagnose repository documentation");
  }

  docsCmd
    .command("doctor")
    .description("Run structural checks on docs")
    .action(async () => {
      const { execSync } = await import("child_process");

      console.log(`[INFO] Running docs doctor...`);
      try {
        execSync("pnpm check:docs", { encoding: "utf-8", stdio: "inherit" });
      } catch (err: any) {
        console.error(`[ERROR] Docs checks failed.`);
        process.exit(1);
      }
    });
}
