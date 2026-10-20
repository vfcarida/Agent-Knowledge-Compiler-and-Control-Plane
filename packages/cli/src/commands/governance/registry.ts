import { Command } from "commander";
import type { CLIContext } from "../../types.js";

export function registerRegistryCommand(
  program: Command,
  _ctx: CLIContext,
): void {
  const registryCmd = program
    .command("registry")
    .description(
      "Manage Federated Knowledge Registries and compose cross-domain Knowledge Meshes",
    );

  registryCmd
    .command("publish")
    .description(
      "Publish a compiled domain bundle (IR + Manifest + optional Attestation) to a Federated Registry",
    )
    .requiredOption("-r, --registry <dir>", "Path to Federated Registry root")
    .requiredOption("-d, --domain <name>", "Domain identifier")
    .option("-v, --version <ver>", "Bundle semantic version", "0.1.0")
    .option("--ir <path>", "Path to compiled ir.json", "dist/ir.json")
    .option(
      "--manifest <path>",
      "Path to akcp-manifest.json",
      "dist/akcp-manifest.json",
    )
    .option(
      "--attestation <path>",
      "Optional path to Ed25519 akcp-attestation.sig.json",
    )
    .option("-f, --format <fmt>", "Output format: text or json", "text")
    .action(async (options) => {
      const { publishBundleToRegistry } = await import("@akcp/core");
      try {
        const entry = publishBundleToRegistry({
          registryDir: options.registry,
          domain: options.domain,
          version: options.version,
          irPath: options.ir,
          manifestPath: options.manifest,
          attestationPath: options.attestation,
        });
        if (options.format === "json") {
          console.log(JSON.stringify(entry, null, 2));
        } else {
          console.log(
            `[REGISTRY] Published ${entry.domain}@${entry.version} (${entry.conceptCount} concepts, signed: ${entry.signed}) -> ${entry.relativePath}`,
          );
        }
      } catch (err) {
        console.error(
          `[ERROR] Registry publish failed: ${(err as Error).message}`,
        );
        process.exit(1);
      }
    });

  registryCmd
    .command("list")
    .description("List all domain bundles published in a Federated Registry")
    .requiredOption("-r, --registry <dir>", "Path to Federated Registry root")
    .option("-f, --format <fmt>", "Output format: text or json", "text")
    .action(async (options) => {
      const { listRegistryBundles } = await import("@akcp/core");
      const index = listRegistryBundles(options.registry);
      if (options.format === "json") {
        console.log(JSON.stringify(index, null, 2));
      } else {
        console.log(
          `[REGISTRY] ${index.entries.length} bundle(s) in ${options.registry}:`,
        );
        for (const e of index.entries) {
          console.log(
            `  - ${e.domain}@${e.version} (${e.conceptCount} concepts | signed: ${e.signed} | irHash: ${e.irHash.slice(0, 12)})`,
          );
        }
      }
    });

  registryCmd
    .command("verify")
    .description(
      "Verify SHA-256 integrity and optional Ed25519 signature of a registered domain bundle",
    )
    .requiredOption("-r, --registry <dir>", "Path to Federated Registry root")
    .requiredOption("-d, --domain <name>", "Domain identifier")
    .option("-v, --version <ver>", "Optional bundle version")
    .option("-p, --public-key <path>", "Path to Ed25519 public key PEM")
    .option(
      "--require-signed",
      "Fail if bundle is not cryptographically signed",
    )
    .option("-f, --format <fmt>", "Output format: text or json", "text")
    .action(async (options) => {
      const fs = await import("node:fs");
      const { verifyRegistryBundle } = await import("@akcp/core");
      const publicKeyPem = options.publicKey
        ? fs.readFileSync(options.publicKey, "utf-8")
        : undefined;
      const res = verifyRegistryBundle({
        registryDir: options.registry,
        domain: options.domain,
        version: options.version,
        publicKeyPem,
        requireSigned: Boolean(options.requireSigned),
      });
      if (options.format === "json") {
        console.log(JSON.stringify(res, null, 2));
      } else if (res.valid) {
        console.log(
          `[OK] Verified ${res.domain}@${res.version} (IR hash: valid, Manifest hash: valid${res.signatureVerified !== undefined ? `, Ed25519 signature: ${res.signatureVerified}` : ""})`,
        );
      } else {
        console.error(
          `[ERROR] Verification failed for ${res.domain}@${res.version}:\n  - ${res.errors.join("\n  - ")}`,
        );
      }
      if (!res.valid) {
        process.exit(1);
      }
    });

  registryCmd
    .command("compose")
    .description(
      "Compose multiple domain bundles from a Federated Registry into a unified Knowledge Mesh",
    )
    .requiredOption("-r, --registry <dir>", "Path to Federated Registry root")
    .requiredOption(
      "-d, --domains <list>",
      "Comma-separated list of domains (e.g., it-operations,customer-support)",
    )
    .option(
      "-o, --out <dir>",
      "Output directory for federated-ir.json and federated-graph.json",
    )
    .option(
      "-p, --public-key <path>",
      "Optional Ed25519 public key PEM to verify all domains",
    )
    .option(
      "--require-signed",
      "Require valid Ed25519 attestation on every composed domain",
    )
    .option("-f, --format <fmt>", "Output format: text or json", "text")
    .action(async (options) => {
      const fs = await import("node:fs");
      const { composeFederatedKnowledgeMesh } = await import("@akcp/core");
      const publicKeyPem = options.publicKey
        ? fs.readFileSync(options.publicKey, "utf-8")
        : undefined;

      const domainSpecs = String(options.domains)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((item) => {
          const [domain, version] = item.split("@");
          return { domain: domain ?? item, version, publicKeyPem };
        });

      const mesh = composeFederatedKnowledgeMesh({
        registryDir: options.registry,
        domains: domainSpecs,
        requireSigned: Boolean(options.requireSigned),
        outputDir: options.out,
      });

      if (options.format === "json") {
        console.log(JSON.stringify(mesh, null, 2));
      } else if (mesh.ok) {
        console.log(
          `[MESH] Composed ${mesh.domains.join(", ")} -> ${mesh.totalConcepts} total concepts, ${mesh.crossDomainEdgesCount} cross-domain edge(s), ${mesh.collisions.length} collision(s)`,
        );
      } else {
        console.error(
          `[ERROR] Federated composition failed:\n  - ${mesh.errors.join("\n  - ")}`,
        );
      }

      if (!mesh.ok) {
        process.exit(1);
      }
    });
}
