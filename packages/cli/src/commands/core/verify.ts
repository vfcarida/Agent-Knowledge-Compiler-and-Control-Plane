import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerVerifyCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  program
    .command("verify")
    .description(
      "Verify the cryptographic provenance, file hashes, and optional Ed25519 attestation of a compiled bundle",
    )
    .argument("<manifest>", "Path to akcp-manifest.json")
    .option(
      "-p, --public-key <path>",
      "Path to Ed25519 public key PEM file to verify signed in-toto attestation",
    )
    .option(
      "-a, --attestation <path>",
      "Explicit path to .attestation.json file (defaults to <manifest minus .json>.attestation.json)",
    )
    .option("-f, --format <format>", "Output format (text, json)", "text")
    .action(async (manifestPath, options) => {
      const fs = await import("fs");
      const path = await import("path");
      const { verifyManifest, readAndVerifyAttestation } =
        await import("@akcp/core");

      try {
        if (options.format !== "json") {
          console.log(`[INFO] Verifying manifest at ${manifestPath}...`);
        }

        const report = await verifyManifest(manifestPath);
        let signatureValid: boolean | undefined;
        let attestationFile: string | undefined;

        if (options.publicKey) {
          const pubKeyPath = path.resolve(process.cwd(), options.publicKey);
          if (!fs.existsSync(pubKeyPath)) {
            console.error(`[ERROR] Public key not found at ${pubKeyPath}`);
            process.exit(1);
          }
          const publicKeyPem = fs.readFileSync(pubKeyPath, "utf-8");
          const fullManifestPath = path.resolve(process.cwd(), manifestPath);
          attestationFile = options.attestation
            ? path.resolve(process.cwd(), options.attestation)
            : fullManifestPath.replace(/\.json$/, "") + ".attestation.json";

          if (!fs.existsSync(attestationFile)) {
            console.error(
              `[ERROR] Signed attestation not found at ${attestationFile}`,
            );
            process.exit(1);
          }

          const attResult = await readAndVerifyAttestation(
            attestationFile,
            publicKeyPem,
          );
          signatureValid = attResult.valid;
        }

        const overallValid =
          report.isValid && (signatureValid === undefined || signatureValid);

        if (options.format === "json") {
          console.log(
            JSON.stringify(
              {
                ...report,
                isValid: overallValid,
                signatureValid,
                attestationFile,
              },
              null,
              2,
            ),
          );
          if (!overallValid) {
            process.exit(1);
          }
          return;
        }

        if (overallValid) {
          console.log(`[OK] Bundle integrity verified successfully.`);
          console.log(`[OK] Provenance Timestamp: ${report.manifestTimestamp}`);
          if (signatureValid === true) {
            console.log(
              `[OK] Ed25519 in-toto attestation signature verified (${attestationFile}).`,
            );
          }
        } else {
          if (!report.isValid) {
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
          }
          if (signatureValid === false) {
            console.error(
              `[ERROR] Ed25519 attestation signature verification FAILED for ${attestationFile}.`,
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
