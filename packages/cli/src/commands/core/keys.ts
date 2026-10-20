import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerKeysCommand(program: Command, _ctx: CLIContext): void {
  const keysCmd = program
    .command("keys")
    .description(
      "Manage KMS envelope-encrypted Ed25519 signing keys, rotation, and revocation",
    );

  keysCmd
    .command("init")
    .description(
      "Initialize a KMS envelope keyring and generate the primary active Ed25519 signing key",
    )
    .option(
      "-k, --keyring <path>",
      "Path to keyring manifest JSON",
      ".akcp/keyring.json",
    )
    .requiredOption(
      "--kek <passphrase>",
      "Key-encryption key (KEK) passphrase for AES-256-GCM wrapping",
    )
    .option("--json", "Output result as JSON", false)
    .action(async (options) => {
      const path = await import("path");
      const { KmsEnvelopeKeyring } = await import("@akcp/core");

      try {
        const keyringPath = path.resolve(process.cwd(), options.keyring);
        const keyring = KmsEnvelopeKeyring.loadFromFile(keyringPath);
        const entry = keyring.generateKey(options.kek, true);
        keyring.saveToFile(keyringPath);

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                keyId: entry.keyId,
                status: entry.status,
                keyringPath,
                createdAt: entry.createdAt,
              },
              null,
              2,
            ),
          );
        } else {
          console.log(
            `[OK] Generated KMS-wrapped Ed25519 key '${entry.keyId}' (status: ${entry.status}) in ${keyringPath}`,
          );
        }
      } catch (err: any) {
        console.error(`[ERROR] Keyring init failed:\n${err.message}`);
        process.exit(1);
      }
    });

  keysCmd
    .command("rotate")
    .description(
      "Rotate the active signing key in the KMS keyring (retires current active key and generates a new one)",
    )
    .option(
      "-k, --keyring <path>",
      "Path to keyring manifest JSON",
      ".akcp/keyring.json",
    )
    .requiredOption(
      "--kek <passphrase>",
      "Key-encryption key (KEK) passphrase for AES-256-GCM wrapping",
    )
    .option("--json", "Output result as JSON", false)
    .action(async (options) => {
      const path = await import("path");
      const { KmsEnvelopeKeyring } = await import("@akcp/core");

      try {
        const keyringPath = path.resolve(process.cwd(), options.keyring);
        const keyring = KmsEnvelopeKeyring.loadFromFile(keyringPath);
        const prevActive = keyring.getManifest().activeKeyId;
        const nextEntry = keyring.rotateKey(options.kek);
        keyring.saveToFile(keyringPath);

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                previousActiveKeyId: prevActive,
                newActiveKeyId: nextEntry.keyId,
                rotatedAt: nextEntry.createdAt,
              },
              null,
              2,
            ),
          );
        } else {
          console.log(
            `[OK] Rotated signing key: '${prevActive ?? "none"}' -> '${nextEntry.keyId}'`,
          );
        }
      } catch (err: any) {
        console.error(`[ERROR] Key rotation failed:\n${err.message}`);
        process.exit(1);
      }
    });

  keysCmd
    .command("revoke")
    .description("Revoke a compromised or expired signing key by keyId")
    .requiredOption("--key-id <id>", "The 16-char hex keyId to revoke")
    .option(
      "-k, --keyring <path>",
      "Path to keyring manifest JSON",
      ".akcp/keyring.json",
    )
    .option("--json", "Output result as JSON", false)
    .action(async (options) => {
      const path = await import("path");
      const { KmsEnvelopeKeyring } = await import("@akcp/core");

      try {
        const keyringPath = path.resolve(process.cwd(), options.keyring);
        const keyring = KmsEnvelopeKeyring.loadFromFile(keyringPath);
        const revoked = keyring.revokeKey(options.keyId);
        keyring.saveToFile(keyringPath);

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                keyId: revoked.keyId,
                status: revoked.status,
                revokedAt: revoked.revokedAt,
                activeKeyId: keyring.getManifest().activeKeyId,
              },
              null,
              2,
            ),
          );
        } else {
          console.log(
            `[OK] Revoked key '${revoked.keyId}' at ${revoked.revokedAt}`,
          );
        }
      } catch (err: any) {
        console.error(`[ERROR] Key revocation failed:\n${err.message}`);
        process.exit(1);
      }
    });

  keysCmd
    .command("inspect")
    .description("Inspect keys and lifecycle status in a KMS keyring")
    .option(
      "-k, --keyring <path>",
      "Path to keyring manifest JSON",
      ".akcp/keyring.json",
    )
    .option("--json", "Output manifest summary as JSON", false)
    .action(async (options) => {
      const path = await import("path");
      const { KmsEnvelopeKeyring } = await import("@akcp/core");

      try {
        const keyringPath = path.resolve(process.cwd(), options.keyring);
        const keyring = KmsEnvelopeKeyring.loadFromFile(keyringPath);
        const manifest = keyring.getManifest();

        const summary = {
          schemaVersion: manifest.schemaVersion,
          activeKeyId: manifest.activeKeyId,
          keys: manifest.keys.map((k) => ({
            keyId: k.keyId,
            status: k.status,
            createdAt: k.createdAt,
            rotatedAt: k.rotatedAt,
            revokedAt: k.revokedAt,
            envelopeAlgorithm: k.wrappedPrivateKey?.algorithm ?? "none",
          })),
        };

        if (options.json) {
          console.log(JSON.stringify(summary, null, 2));
        } else {
          console.log(`=== AKCP KMS Keyring (${keyringPath}) ===`);
          console.log(`Active Key ID: ${summary.activeKeyId ?? "None"}`);
          console.log(`Total Keys:    ${summary.keys.length}`);
          for (const k of summary.keys) {
            console.log(
              `  - [${k.status.toUpperCase()}] ${k.keyId} (Created: ${k.createdAt}, Envelope: ${k.envelopeAlgorithm})`,
            );
          }
        }
      } catch (err: any) {
        console.error(`[ERROR] Keyring inspection failed:\n${err.message}`);
        process.exit(1);
      }
    });
}
