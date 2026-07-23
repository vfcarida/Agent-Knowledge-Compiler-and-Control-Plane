import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerDiffCommand(program: Command, _ctx: CLIContext): void {
  program
    .command("diff")
    .description("[Planned] Show semantic context changes since last build")
    .argument("[directory]", "Path to the OKF bundle directory")
    .action((_directory) => {
      console.error(
        `[ERROR] NOT_IMPLEMENTED: The diff command is a planned feature and is not yet implemented.`,
      );
      process.exit(1);
    });
}
