import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerPolicyValidateCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  let policyCmd = program.commands.find((c) => c.name() === "policy");
  if (!policyCmd) {
    policyCmd = program
      .command("policy")
      .description("Manage and validate machine-readable Policy Cards");
  }

  policyCmd
    .command("validate")
    .description("Validate a PolicyCard YAML file")
    .argument("<file>", "Path to the .policy.yaml file")
    .action(async (file) => {
      const path = await import("path");
      const { loadPolicy } = await import("@akcp/core");

      try {
        const fullPath = path.resolve(process.cwd(), file);
        loadPolicy(fullPath);
        console.log(`[OK] Policy is structurally valid and well-formed.`);
      } catch (err: any) {
        console.error(`[ERROR] Policy validation failed:\n${err.message}`);
        process.exit(1);
      }
    });
}
