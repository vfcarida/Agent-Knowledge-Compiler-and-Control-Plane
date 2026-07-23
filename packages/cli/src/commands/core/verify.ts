import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerVerifyCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  program
    .command("verify")
    .description(
      "Verify the cryptographic provenance and integrity of a compiled bundle",
    )
    .argument("<manifest>", "Path to akcp-manifest.json")
    .action(async (manifestPath) => {
      const { verifyManifest } = await import("@akcp/core");

      try {
        console.log(`[INFO] Verifying manifest at ${manifestPath}...`);

        const report = await verifyManifest(manifestPath);

        if (report.isValid) {
          console.log(`[OK] Bundle integrity verified successfully.`);
          console.log(`[OK] Provenance Timestamp: ${report.manifestTimestamp}`);
        } else {
          console.error(`[ERROR] BUNDLE TAMPERING DETECTED.`);
          if (report.tamperedFiles.length > 0) {
            console.error(
              `[ERROR] The following files have been modified since compilation:`,
            );
            report.tamperedFiles.forEach((f: string) =>
              console.error(`  - ${f}`),
            );
          }
          if (report.missingFiles.length > 0) {
            console.error(`[ERROR] The following files are missing:`);
            report.missingFiles.forEach((f: string) =>
              console.error(`  - ${f}`),
            );
          }
          process.exit(1);
        }
      } catch (err: any) {
        console.error(`[ERROR] Verification failed: ${err.message}`);
        process.exit(1);
      }
    });
}
