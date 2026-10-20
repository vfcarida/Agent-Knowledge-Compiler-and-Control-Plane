import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerSignCommand(program: Command, _ctx: CLIContext): void {
  program
    .command("sign")
    .description(
      "Cryptographically sign a compiled bundle provenance manifest with Ed25519 (in-toto ITE-6)",
    )
    .argument(
      "[manifest]",
      "Path to akcp-manifest.json",
      "dist/akcp-manifest.json",
    )
    .option("-k, --private-key <path>", "Path to Ed25519 private key PEM file")
    .option(
      "--generate-keys <directory>",
      "Generate a new Ed25519 keypair (akcp-signing.key and akcp-signing.pub) in the specified directory",
    )
    .option("-f, --format <format>", "Output format (text, json)", "text")
    .action(async (manifestPath, options) => {
      const fs = await import("fs");
      const path = await import("path");
      const { generateSigningKeyPair, writeSignedAttestation } =
        await import("@akcp/core");

      try {
        const fullManifestPath = path.resolve(process.cwd(), manifestPath);
        if (!fs.existsSync(fullManifestPath)) {
          console.error(
            `[ERROR] Provenance manifest not found at ${fullManifestPath}`,
          );
          process.exit(1);
        }

        let privateKeyPem: string | undefined;
        let generatedPublicKeyPath: string | undefined;
        let generatedPrivateKeyPath: string | undefined;

        if (options.generateKeys) {
          const keyDir = path.resolve(process.cwd(), options.generateKeys);
          fs.mkdirSync(keyDir, { recursive: true });
          const pair = generateSigningKeyPair();
          generatedPrivateKeyPath = path.join(keyDir, "akcp-signing.key");
          generatedPublicKeyPath = path.join(keyDir, "akcp-signing.pub");
          fs.writeFileSync(generatedPrivateKeyPath, pair.privateKeyPem, {
            encoding: "utf-8",
            mode: 0o600,
          });
          fs.writeFileSync(generatedPublicKeyPath, pair.publicKeyPem, "utf-8");
          privateKeyPem = pair.privateKeyPem;
        } else if (options.privateKey) {
          const keyPath = path.resolve(process.cwd(), options.privateKey);
          if (!fs.existsSync(keyPath)) {
            console.error(`[ERROR] Private key not found at ${keyPath}`);
            process.exit(1);
          }
          privateKeyPem = fs.readFileSync(keyPath, "utf-8");
        } else {
          console.error(
            "[ERROR] Either --private-key <path> or --generate-keys <directory> is required.",
          );
          process.exit(1);
        }

        const manifest = JSON.parse(fs.readFileSync(fullManifestPath, "utf-8"));
        const attestationPath = await writeSignedAttestation(
          manifest,
          fullManifestPath,
          privateKeyPem,
        );
        const signedObj = JSON.parse(fs.readFileSync(attestationPath, "utf-8"));
        const keyid = signedObj.signatures?.[0]?.keyid ?? "unknown";

        if (options.format === "json") {
          console.log(
            JSON.stringify(
              {
                signed: true,
                manifestPath: fullManifestPath,
                attestationPath,
                keyid,
                subjectsCount: signedObj.attestation?.subject?.length ?? 0,
                publicKeyPath: generatedPublicKeyPath,
                privateKeyPath: generatedPrivateKeyPath,
              },
              null,
              2,
            ),
          );
          return;
        }

        if (generatedPublicKeyPath && generatedPrivateKeyPath) {
          console.log(
            `[OK] Generated Ed25519 keypair:\n  Private Key: ${generatedPrivateKeyPath}\n  Public Key:  ${generatedPublicKeyPath}`,
          );
        }
        console.log(
          `[OK] Signed in-toto ITE-6 provenance attestation written to ${attestationPath} (Key ID: ${keyid})`,
        );
      } catch (err: any) {
        console.error(`[ERROR] Provenance signing failed: ${err.message}`);
        process.exit(1);
      }
    });
}
