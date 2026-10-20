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
    .option("-p, --profile <profile>", "AKCP profile to test against", "career")
    .option("-f, --format <format>", "Output format (text or json)", "text")
    .option(
      "--zero-trust",
      "Verify formal policy invariants and cryptographic provenance for AKCP-zero-trust-attested certification",
      false,
    )
    .option(
      "--public-key <path>",
      "Path to Ed25519 public key PEM for signed attestation verification",
    )
    .action(async (options) => {
      const path = await import("path");
      const fs = await import("fs");
      const { ConformanceRunner } = await import("@akcp/conformance");

      try {
        const bundlePath = path.resolve(process.cwd(), options.bundle);
        const publicKeyPem = options.publicKey
          ? fs.readFileSync(
              path.resolve(process.cwd(), options.publicKey),
              "utf-8",
            )
          : undefined;

        const runner = new ConformanceRunner(bundlePath, options.profile, {
          verifyZeroTrust: Boolean(options.zeroTrust),
          publicKeyPem,
        });
        const report = await runner.run();

        if (options.format === "json") {
          console.log(JSON.stringify(report, null, 2));
        } else {
          const levels = [
            {
              name: "OKF-compatible",
              label: "Level 1: OKF-compatible (Base Spec)",
            },
            {
              name: "AKCP-profile-compatible",
              label: "Level 2: AKCP-profile-compatible",
            },
            {
              name: "AKCP-compiler-compatible",
              label: "Level 3: AKCP-compiler-compatible",
            },
            {
              name: "AKCP-control-plane-compatible",
              label: "Level 4: AKCP-control-plane-compatible",
            },
            ...(options.zeroTrust ||
            report.conformanceLevel === "AKCP-zero-trust-attested"
              ? [
                  {
                    name: "AKCP-zero-trust-attested",
                    label: "Level 5: AKCP-zero-trust-attested",
                  },
                ]
              : []),
          ];

          console.log("\n=============================================");
          console.log("         AKCP CONFORMANCE REPORT");
          console.log("=============================================");
          console.log(`Bundle Path:       ${bundlePath}`);
          console.log(`Profile:           ${options.profile}`);
          console.log(
            `Conformance Level: [${report.conformanceLevel.toUpperCase()}]`,
          );
          console.log("---------------------------------------------");

          const reachedNone = report.conformanceLevel === "none";
          let currentLevelFound = false;

          for (const lvl of levels) {
            if (reachedNone) {
              console.log(`[ ] ❌ ${lvl.label} (Not Reached)`);
              continue;
            }

            if (lvl.name === report.conformanceLevel) {
              console.log(`[*] ✅ ${lvl.label} (Current Level)`);
              currentLevelFound = true;
            } else if (!currentLevelFound) {
              console.log(`[x] ✅ ${lvl.label}`);
            } else {
              console.log(`[ ] ⚠️  ${lvl.label} (Not Reached)`);
            }
          }

          if (report.details.length > 0) {
            console.log("\n[DETAILS]");

            report.details.forEach((det: any) => {
              const fileStr = det.file ? ` (${det.file})` : "";
              const typeStr = det.type === "error" ? "❌ ERROR" : "⚠️  WARN";
              console.log(
                `  - [${typeStr}] [${det.ruleId}]${fileStr}: ${det.message}`,
              );
            });
          }

          console.log("\nSummary:");
          console.log(`- Passed Checks: ${report.passed}`);
          console.log(`- Failed Checks: ${report.failed}`);
          console.log(`- Warnings:      ${report.warnings}`);
          console.log("=============================================\n");
        }

        if (report.conformanceLevel === "none") {
          process.exit(1);
        }
      } catch (e: any) {
        console.error(`[ERROR] Conformance suite failed: ${e.message}`);
        process.exit(1);
      }
    });
}
