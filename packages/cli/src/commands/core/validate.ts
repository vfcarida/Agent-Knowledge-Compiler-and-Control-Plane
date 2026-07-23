import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerValidateCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  program
    .command("validate")
    .description("Strict offline schema validation of an OKF/Context bundle")
    .argument("[directory]", "Directory to validate", ".")
    .option(
      "-f, --format <format>",
      "Output format (json or markdown)",
      "markdown",
    )
    .option(
      "-b, --bundle <directory>",
      "Directory to validate (overrides positional argument)",
    )
    .option("-p, --profile <profile>", "Profile to validate against", "career")
    .action(async (directory, options) => {
      const fs = await import("fs");
      const path = await import("path");
      const { execSync } = await import("child_process");
      const { createRequire } = await import("module");

      const targetDir = path.resolve(
        process.cwd(),
        options.bundle || directory,
      );
      console.log(`[INFO] Validating bundle at: ${targetDir}`);

      if (!fs.existsSync(targetDir)) {
        console.error(`[ERROR] Directory not found: ${targetDir}`);
        process.exit(1);
      }

      try {
        const require = createRequire(import.meta.url);
        const validatorPath =
          require.resolve("@akcp/core/dist/cli/validate-bundle.js");
        execSync(
          `node ${validatorPath} --bundle ${targetDir} --format ${options.format} --profile ${options.profile}`,
          { encoding: "utf-8", stdio: "inherit" },
        );
      } catch (err: any) {
        console.error(`[ERROR] Validation command failed:`, err.message);
        process.exit(1);
      }
    });
}
