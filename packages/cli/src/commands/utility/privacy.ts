import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerPrivacyCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  let privacyCmd = program.commands.find((c) => c.name() === "privacy");
  if (!privacyCmd) {
    privacyCmd = program
      .command("privacy")
      .description("Manage PII redaction and privacy compliance");
  }

  privacyCmd
    .command("redact")
    .description("Redact or tokenize PII from text")
    .requiredOption("-t, --text <text>", "Text to analyze and redact")
    .option(
      "-m, --mode <mode>",
      "Redaction mode (redact, tokenize, detect-only)",
      "redact",
    )
    .action(async (options) => {
      const { PiiRedactor } = await import("@akcp/core");

      try {
        const redactor = new PiiRedactor();

        const result = await redactor.redact(options.text, {
          mode: options.mode as any,
        });

        console.log(`\n=== PII Redaction Result ===`);
        console.log(`Original:  ${options.text}`);
        console.log(`Redacted:  ${result.redactedText}`);
        console.log(`Findings:  ${result.findings.length}`);
        console.log(`Blocked:   ${result.blocked}`);

        if (result.findings.length > 0) {
          console.log("\nDetails:");

          result.findings.forEach((f: any) => {
            console.log(
              `  - [${f.type.toUpperCase()}] "${f.value}" (pos: ${f.start}-${f.end})`,
            );
          });
        }
        console.log("============================\n");
      } catch (err: any) {
        console.error(`[ERROR] Redaction failed: ${err.message}`);
        process.exit(1);
      }
    });
}
