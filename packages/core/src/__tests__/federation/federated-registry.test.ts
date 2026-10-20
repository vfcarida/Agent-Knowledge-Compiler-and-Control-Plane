import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  publishBundleToRegistry,
  listRegistryBundles,
  verifyRegistryBundle,
  composeFederatedKnowledgeMesh,
} from "../../federation/federated-registry.js";
import {
  generateSigningKeyPair,
  buildAttestation,
  signAttestation,
} from "../../provenance/sign.js";
import type { AgentKnowledgeIR } from "../../ir/types.js";
import type { BuildManifest } from "../../provenance/types.js";

describe("Federated Knowledge Registry & Cross-Domain Knowledge Mesh", () => {
  let tmpDir: string;
  let registryDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "akcp-fed-"));
    registryDir = path.join(tmpDir, "registry");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createDomainArtifacts(
    domainName: string,
    ir: AgentKnowledgeIR,
    privateKeyPem?: string,
  ): { irPath: string; manifestPath: string; attestationPath?: string } {
    const dir = path.join(tmpDir, domainName);
    fs.mkdirSync(dir, { recursive: true });
    const irPath = path.join(dir, "ir.json");
    const manifestPath = path.join(dir, "akcp-manifest.json");
    fs.writeFileSync(irPath, JSON.stringify(ir, null, 2), "utf-8");

    const manifest: BuildManifest = {
      schemaVersion: "1.0.0",
      buildId: `build-${domainName}`,
      createdAt: new Date(0).toISOString(),
      source: { root: ".", config: "akcp.yaml", hash: "abc1234" },
      compiler: { name: "akcp", version: "0.1.0" },
      targets: [
        {
          name: "context-pack",
          status: "success",
          outputs: ["dist/ir.json"],
          hash: "deadbeef",
        },
      ],
      diagnostics: [],
      conformance: { level: "L3", checks: [] },
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

    let attestationPath: string | undefined;
    if (privateKeyPem) {
      const att = buildAttestation(manifest);
      const signed = signAttestation(att, privateKeyPem);
      attestationPath = path.join(dir, "akcp-attestation.sig.json");
      fs.writeFileSync(
        attestationPath,
        JSON.stringify(signed, null, 2),
        "utf-8",
      );
    }

    return { irPath, manifestPath, attestationPath };
  }

  it("publishes, verifies Ed25519 signatures, and composes a cross-domain Knowledge Mesh", () => {
    const { privateKeyPem, publicKeyPem } = generateSigningKeyPair();

    const opsIr: AgentKnowledgeIR = {
      irVersion: "1.0.0",
      okfVersion: "0.1.0",
      bundleId: "it-operations",
      buildId: "build-ops",
      timestamp: new Date(0).toISOString(),
      concepts: [
        {
          conceptId: "payment-service",
          type: "Service",
          frontmatter: {
            id: "payment-service",
            title: "Payment Service",
            type: "Service",
            sensitivity: "internal",
          },
          body: "Core payment service.",
          budget: { byteSize: 21, estimatedTokens: 6 },
          source: { format: "okf/markdown", filePath: "payment-service.md" },
        },
        {
          conceptId: "shared-glossary",
          type: "Concept",
          frontmatter: {
            id: "shared-glossary",
            title: "Shared Glossary",
            type: "Concept",
          },
          body: "Ops glossary.",
          budget: { byteSize: 13, estimatedTokens: 4 },
          source: { format: "okf/markdown", filePath: "shared-glossary.md" },
        },
      ],
      policies: {},
      capabilities: [],
    };

    const supportIr: AgentKnowledgeIR = {
      irVersion: "1.0.0",
      okfVersion: "0.1.0",
      bundleId: "customer-support",
      buildId: "build-support",
      timestamp: new Date(0).toISOString(),
      concepts: [
        {
          conceptId: "billing-dispute-macro",
          type: "Runbook",
          frontmatter: {
            id: "billing-dispute-macro",
            title: "Billing Dispute Macro",
            type: "Runbook",
            depends_on: ["it-operations:payment-service"],
          },
          body: "Check [[it-operations:payment-service]] before issuing refund.",
          budget: { byteSize: 62, estimatedTokens: 16 },
          source: {
            format: "okf/markdown",
            filePath: "billing-dispute-macro.md",
          },
        },
        {
          conceptId: "shared-glossary",
          type: "Concept",
          frontmatter: {
            id: "shared-glossary",
            title: "Support Glossary",
            type: "Concept",
          },
          body: "Support glossary.",
          budget: { byteSize: 17, estimatedTokens: 5 },
          source: { format: "okf/markdown", filePath: "shared-glossary.md" },
        },
      ],
      policies: {},
      capabilities: [],
    };

    const opsFiles = createDomainArtifacts(
      "it-operations",
      opsIr,
      privateKeyPem,
    );
    const supportFiles = createDomainArtifacts(
      "customer-support",
      supportIr,
      privateKeyPem,
    );

    publishBundleToRegistry({
      registryDir,
      domain: "it-operations",
      version: "1.0.0",
      ...opsFiles,
    });
    publishBundleToRegistry({
      registryDir,
      domain: "customer-support",
      version: "1.0.0",
      ...supportFiles,
    });

    const list = listRegistryBundles(registryDir);
    expect(list.entries).toHaveLength(2);

    const verifyOps = verifyRegistryBundle({
      registryDir,
      domain: "it-operations",
      publicKeyPem,
      requireSigned: true,
    });
    expect(verifyOps.valid).toBe(true);
    expect(verifyOps.signatureVerified).toBe(true);

    const meshOutDir = path.join(tmpDir, "mesh-out");
    const mesh = composeFederatedKnowledgeMesh({
      registryDir,
      domains: [
        { domain: "it-operations", publicKeyPem },
        { domain: "customer-support", publicKeyPem },
      ],
      requireSigned: true,
      outputDir: meshOutDir,
    });

    expect(mesh.ok).toBe(true);
    expect(mesh.totalConcepts).toBe(4);
    expect(mesh.crossDomainEdgesCount).toBe(1);
    expect(mesh.collisions).toEqual([
      {
        unqualifiedConceptId: "shared-glossary",
        domains: ["customer-support", "it-operations"],
      },
    ]);
    expect(mesh.graph.impactMap["it-operations:payment-service"]).toContain(
      "customer-support:billing-dispute-macro",
    );
    expect(fs.existsSync(path.join(meshOutDir, "federated-ir.json"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(meshOutDir, "federated-graph.json"))).toBe(
      true,
    );
  });
});
