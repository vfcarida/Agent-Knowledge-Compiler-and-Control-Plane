import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerServeDashboardCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  let serveCmd = program.commands.find((c) => c.name() === "serve");
  if (!serveCmd) {
    serveCmd = program
      .command("serve")
      .description("[Experimental] Locally serve AKCP capabilities");
  }

  serveCmd
    .command("dashboard")
    .description("[Planned] Launch the Dashboard locally")
    .action(async () => {
      console.error(
        `[ERROR] NOT_IMPLEMENTED: The dashboard is a planned feature and is not yet implemented.`,
      );
      process.exit(1);
    });
}
