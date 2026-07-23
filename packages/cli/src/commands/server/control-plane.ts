import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerControlPlaneCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  let controlPlaneCmd = program.commands.find(
    (c) => c.name() === "control-plane",
  );
  if (!controlPlaneCmd) {
    controlPlaneCmd = program
      .command("control-plane")
      .description(
        "[Experimental] Manage runtime governance, policies, and HITL approvals",
      );
  }

  controlPlaneCmd
    .command("inspect")
    .description("[Planned] Inspect the desired state model for agents")
    .action(() => {
      console.error(
        "[ERROR] NOT_IMPLEMENTED: The control-plane inspect command is not yet implemented.",
      );
      process.exit(1);
    });

  controlPlaneCmd
    .command("policies")
    .description("[Planned] List registered policy cards")
    .action(() => {
      console.error(
        "[ERROR] NOT_IMPLEMENTED: The control-plane policies command is not yet implemented.",
      );
      process.exit(1);
    });

  controlPlaneCmd
    .command("approvals")
    .description("[Planned] List pending approvals")
    .action(() => {
      console.error(
        "[ERROR] NOT_IMPLEMENTED: The control-plane approvals command is not yet implemented.",
      );
      process.exit(1);
    });

  controlPlaneCmd
    .command("audit")
    .description("[Planned] Tail the audit event log")
    .action(() => {
      console.error(
        "[ERROR] NOT_IMPLEMENTED: The control-plane audit command is not yet implemented.",
      );
      process.exit(1);
    });
}
