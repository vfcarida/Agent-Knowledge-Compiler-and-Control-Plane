import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerConformanceRunCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  let conformanceCmd = program.commands.find((c) => c.name() === "conformance");
  if (!conformanceCmd) {
    conformanceCmd = program
      .command("conformance")
      .description("Run conformance suite to certify OKF/AKCP compatibility");
  }

  conformanceCmd
    .command("run")
    .description("Run conformance suite on a target bundle")
    .requiredOption("-b, --bundle <directory>", "Path to the context bundle")
    .option(
      "-l, --level <level>",
      "Conformance level (basic | standard | strict)",
      "standard",
    )
    .option("-f, --format <format>", "Output format (text or json)", "text")
    .action(async (options) => {
      const path = await import("path");
      const { ConformanceRunner } = await import("@akcp/conformance");

      try {
        const bundlePath = path.resolve(process.cwd(), options.bundle);
        const level = options.level as "basic" | "standard" | "strict";

        if (!["basic", "standard", "strict"].includes(level)) {
          console.error(
            `[ERROR] Invalid level: ${level}. Must be basic, standard, or strict.`,
          );
          process.exit(1);
        }

        const runner = new ConformanceRunner(bundlePath);
        const report = await runner.run();

        const conformant = report.failed === 0;

        if (options.format === "json") {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log("\n=============================================");
          console.log("         AKCP CONFORMANCE REPORT");
          console.log("=============================================");
          console.log(`Bundle Path:       ${bundlePath}`);
          console.log(
            `Conformance Level: [${report.conformanceLevel.toUpperCase()}]`,
          );
          console.log(
            `Status:            ${conformant ? "✅ PASS" : "❌ FAIL"}`,
          );
          console.log("---------------------------------------------");

          for (const check of report.details) {
            let statusIcon = check.type !== "error" ? "✅ PASSED" : "❌ FAILED";
            if (check.type === "warning") {
              statusIcon = "⚠️  WARNING";
            }
            let targetStr = check.file ? ` (${check.file})` : "";
            console.log(
              `[${statusIcon}] ${check.ruleId || "unknown"}${targetStr}`,
            );

            if (check.message) {
              console.log(`    ↳ ${check.message}`);
            }
          }

          console.log("\nSummary:");
          console.log(`- Passed Checks: ${report.passed}`);
          console.log(`- Failed Checks: ${report.failed}`);
          console.log(`- Warnings:      ${report.warnings}`);
          console.log(
            `- Total Checks:  ${report.passed + report.failed + report.warnings}`,
          );
          console.log("=============================================\n");
        }

        if (!conformant) {
          process.exit(1);
        }
      } catch (e: any) {
        console.error(`[ERROR] Conformance suite failed: ${e.message}`);
        process.exit(1);
      }
    });
}
