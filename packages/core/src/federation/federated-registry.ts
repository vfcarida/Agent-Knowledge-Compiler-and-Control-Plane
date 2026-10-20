import fs from "node:fs";
import path from "node:path";
import { computeFileSha256 } from "../provenance/hash.js";
import {
  verifyAttestationSignature,
  type SignedAttestation,
} from "../provenance/sign.js";
import type { AgentKnowledgeIR, IRConcept } from "../ir/types.js";
import type { GraphEdge, ImpactMap } from "../graph/types.js";
import { computeImpactMap } from "../graph/impact-analysis.js";

export interface FederatedGraphNode {
  conceptId: string;
  type: string;
  title: string;
  sensitivity: "public" | "internal" | "confidential" | "restricted";
  status: string;
}

export interface FederatedSemanticGraph {
  version: "1.0";
  generatedAt: string;
  nodes: FederatedGraphNode[];
  edges: GraphEdge[];
  impactMap: ImpactMap;
}

export interface FederatedRegistryEntry {
  domain: string;
  version: string;
  publishedAt: string;
  irHash: string;
  manifestHash: string;
  signed: boolean;
  keyId?: string;
  conceptCount: number;
  relativePath: string;
}

export interface FederatedRegistryIndex {
  version: "1.0";
  updatedAt: string;
  entries: FederatedRegistryEntry[];
}

export interface PublishBundleOptions {
  registryDir: string;
  domain: string;
  version: string;
  irPath: string;
  manifestPath: string;
  attestationPath?: string;
}

export interface VerifyRegistryBundleOptions {
  registryDir: string;
  domain: string;
  version?: string;
  publicKeyPem?: string;
  requireSigned?: boolean;
}

export interface FederatedVerificationResult {
  valid: boolean;
  domain: string;
  version: string;
  irHashValid: boolean;
  manifestHashValid: boolean;
  signatureVerified?: boolean;
  errors: string[];
}

export interface FederatedDomainSpec {
  domain: string;
  version?: string;
  publicKeyPem?: string;
}

export interface ComposeFederatedMeshOptions {
  registryDir: string;
  domains: FederatedDomainSpec[];
  requireSigned?: boolean;
  outputDir?: string;
}

export interface CrossDomainCollision {
  unqualifiedConceptId: string;
  domains: string[];
}

export interface FederatedKnowledgeMesh {
  ok: boolean;
  composedAt: string;
  domains: string[];
  totalConcepts: number;
  crossDomainEdgesCount: number;
  collisions: CrossDomainCollision[];
  ir: AgentKnowledgeIR;
  graph: FederatedSemanticGraph;
  errors: string[];
}

function loadRegistryIndex(registryDir: string): FederatedRegistryIndex {
  const indexPath = path.join(path.resolve(registryDir), "registry-index.json");
  if (!fs.existsSync(indexPath)) {
    return {
      version: "1.0",
      updatedAt: new Date(0).toISOString(),
      entries: [],
    };
  }
  return JSON.parse(
    fs.readFileSync(indexPath, "utf-8"),
  ) as FederatedRegistryIndex;
}

function saveRegistryIndex(
  registryDir: string,
  index: FederatedRegistryIndex,
): void {
  const resolvedDir = path.resolve(registryDir);
  fs.mkdirSync(resolvedDir, { recursive: true });
  const indexPath = path.join(resolvedDir, "registry-index.json");
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf-8");
}

/**
 * Lists all domain bundles published in a Federated Knowledge Registry.
 */
export function listRegistryBundles(
  registryDir: string,
): FederatedRegistryIndex {
  return loadRegistryIndex(registryDir);
}

/**
 * Publishes a compiled AKCP domain bundle (IR + Provenance Manifest + optional Ed25519 Attestation)
 * into a Federated Knowledge Registry.
 */
export function publishBundleToRegistry(
  options: PublishBundleOptions,
): FederatedRegistryEntry {
  const registryDir = path.resolve(options.registryDir);
  const irPath = path.resolve(options.irPath);
  const manifestPath = path.resolve(options.manifestPath);

  if (!fs.existsSync(irPath)) {
    throw new Error(`IR file not found at ${irPath}`);
  }
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest file not found at ${manifestPath}`);
  }

  const relDir = `domains/${options.domain}/${options.version}`;
  const targetDir = path.join(registryDir, relDir);
  fs.mkdirSync(targetDir, { recursive: true });

  const destIrPath = path.join(targetDir, "ir.json");
  const destManifestPath = path.join(targetDir, "akcp-manifest.json");
  fs.copyFileSync(irPath, destIrPath);
  fs.copyFileSync(manifestPath, destManifestPath);

  const irHash = computeFileSha256(destIrPath);
  const manifestHash = computeFileSha256(destManifestPath);

  const irData = JSON.parse(
    fs.readFileSync(destIrPath, "utf-8"),
  ) as AgentKnowledgeIR;
  const conceptCount = Array.isArray(irData.concepts)
    ? irData.concepts.length
    : 0;

  let signed = false;
  let keyId: string | undefined;

  if (options.attestationPath && fs.existsSync(options.attestationPath)) {
    const destAttPath = path.join(targetDir, "akcp-attestation.sig.json");
    fs.copyFileSync(path.resolve(options.attestationPath), destAttPath);
    const attData = JSON.parse(
      fs.readFileSync(destAttPath, "utf-8"),
    ) as SignedAttestation;
    signed = true;
    keyId = attData.signatures?.[0]?.keyid;
  }

  const entry: FederatedRegistryEntry = {
    domain: options.domain,
    version: options.version,
    publishedAt: new Date().toISOString(),
    irHash,
    manifestHash,
    signed,
    keyId,
    conceptCount,
    relativePath: relDir,
  };

  const index = loadRegistryIndex(registryDir);
  index.entries = index.entries.filter(
    (e) => !(e.domain === options.domain && e.version === options.version),
  );
  index.entries.push(entry);
  index.entries.sort((a, b) =>
    `${a.domain}@${a.version}`.localeCompare(`${b.domain}@${b.version}`),
  );
  index.updatedAt = entry.publishedAt;
  saveRegistryIndex(registryDir, index);

  return entry;
}

/**
 * Verifies cryptographic SHA-256 integrity and optional Ed25519 provenance attestation
 * of a domain bundle in the Federated Knowledge Registry.
 */
export function verifyRegistryBundle(
  options: VerifyRegistryBundleOptions,
): FederatedVerificationResult {
  const registryDir = path.resolve(options.registryDir);
  const index = loadRegistryIndex(registryDir);
  const candidates = index.entries.filter((e) => e.domain === options.domain);

  if (candidates.length === 0) {
    return {
      valid: false,
      domain: options.domain,
      version: options.version ?? "unknown",
      irHashValid: false,
      manifestHashValid: false,
      errors: [`Domain '${options.domain}' not found in registry.`],
    };
  }

  const entry = options.version
    ? candidates.find((e) => e.version === options.version)
    : candidates[candidates.length - 1];

  if (!entry) {
    return {
      valid: false,
      domain: options.domain,
      version: options.version ?? "unknown",
      irHashValid: false,
      manifestHashValid: false,
      errors: [
        `Version '${options.version}' of domain '${options.domain}' not found in registry.`,
      ],
    };
  }

  const errors: string[] = [];
  const bundleDir = path.join(registryDir, entry.relativePath);
  const irPath = path.join(bundleDir, "ir.json");
  const manifestPath = path.join(bundleDir, "akcp-manifest.json");
  const attPath = path.join(bundleDir, "akcp-attestation.sig.json");

  let irHashValid = false;
  let manifestHashValid = false;

  if (!fs.existsSync(irPath)) {
    errors.push(`Missing ir.json for ${entry.domain}@${entry.version}`);
  } else {
    const actualIrHash = computeFileSha256(irPath);
    irHashValid = actualIrHash === entry.irHash;
    if (!irHashValid) {
      errors.push(
        `IR SHA-256 mismatch for ${entry.domain}@${entry.version}: expected ${entry.irHash}, got ${actualIrHash}`,
      );
    }
  }

  if (!fs.existsSync(manifestPath)) {
    errors.push(
      `Missing akcp-manifest.json for ${entry.domain}@${entry.version}`,
    );
  } else {
    const actualManifestHash = computeFileSha256(manifestPath);
    manifestHashValid = actualManifestHash === entry.manifestHash;
    if (!manifestHashValid) {
      errors.push(
        `Manifest SHA-256 mismatch for ${entry.domain}@${entry.version}: expected ${entry.manifestHash}, got ${actualManifestHash}`,
      );
    }
  }

  let signatureVerified: boolean | undefined;
  if (options.requireSigned || options.publicKeyPem) {
    if (!fs.existsSync(attPath)) {
      signatureVerified = false;
      errors.push(
        `Missing Ed25519 attestation (akcp-attestation.sig.json) for ${entry.domain}@${entry.version}`,
      );
    } else if (options.publicKeyPem) {
      try {
        const signedAtt = JSON.parse(
          fs.readFileSync(attPath, "utf-8"),
        ) as SignedAttestation;
        signatureVerified = verifyAttestationSignature(
          signedAtt,
          options.publicKeyPem,
        );
        if (!signatureVerified) {
          errors.push(
            `Ed25519 signature verification failed for ${entry.domain}@${entry.version}`,
          );
        }
      } catch (err) {
        signatureVerified = false;
        errors.push(
          `Failed to verify attestation for ${entry.domain}@${entry.version}: ${(err as Error).message}`,
        );
      }
    } else {
      signatureVerified = entry.signed;
    }
  }

  return {
    valid: errors.length === 0 && irHashValid && manifestHashValid,
    domain: entry.domain,
    version: entry.version,
    irHashValid,
    manifestHashValid,
    signatureVerified,
    errors,
  };
}

/**
 * Composes multiple governed domain bundles from a Federated Knowledge Registry
 * into a unified Federated Knowledge Mesh with cross-domain graph resolution and collision detection.
 */
export function composeFederatedKnowledgeMesh(
  options: ComposeFederatedMeshOptions,
): FederatedKnowledgeMesh {
  const registryDir = path.resolve(options.registryDir);
  const index = loadRegistryIndex(registryDir);
  const errors: string[] = [];
  const mergedConcepts: IRConcept[] = [];
  const unqualifiedOwners = new Map<string, string[]>();
  const domainNames: string[] = [];

  for (const spec of options.domains) {
    const verification = verifyRegistryBundle({
      registryDir,
      domain: spec.domain,
      version: spec.version,
      publicKeyPem: spec.publicKeyPem,
      requireSigned: options.requireSigned,
    });

    if (!verification.valid) {
      errors.push(...verification.errors);
      continue;
    }

    const entry = index.entries.find(
      (e) =>
        e.domain === verification.domain && e.version === verification.version,
    );
    if (!entry) continue;

    domainNames.push(`${entry.domain}@${entry.version}`);
    const irPath = path.join(registryDir, entry.relativePath, "ir.json");
    const domainIr = JSON.parse(
      fs.readFileSync(irPath, "utf-8"),
    ) as AgentKnowledgeIR;

    for (const concept of domainIr.concepts) {
      const rawId = concept.conceptId;
      const existingDomains = unqualifiedOwners.get(rawId) ?? [];
      existingDomains.push(entry.domain);
      unqualifiedOwners.set(rawId, existingDomains);

      const namespacedId = `${entry.domain}:${rawId}`;
      mergedConcepts.push({
        ...concept,
        conceptId: namespacedId,
        frontmatter: {
          ...concept.frontmatter,
          id: namespacedId,
          federatedDomain: entry.domain,
          unqualifiedId: rawId,
        },
      });
    }
  }

  const collisions: CrossDomainCollision[] = [];
  for (const [unqualifiedConceptId, domains] of unqualifiedOwners.entries()) {
    const uniqueDomains = Array.from(new Set(domains));
    if (uniqueDomains.length > 1) {
      collisions.push({
        unqualifiedConceptId,
        domains: uniqueDomains.sort(),
      });
    }
  }

  // Build federated semantic graph and resolve cross-domain links
  const conceptIdSet = new Set(mergedConcepts.map((c) => c.conceptId));
  const edges: GraphEdge[] = [];
  let crossDomainEdgesCount = 0;

  function resolveTargetId(
    rawRef: string,
    currentDomain: string,
  ): string | undefined {
    const cleanRef = (rawRef.split("|")[0] ?? "").trim();
    if (conceptIdSet.has(cleanRef)) {
      return cleanRef;
    }
    const sameDomainCandidate = `${currentDomain}:${cleanRef}`;
    if (conceptIdSet.has(sameDomainCandidate)) {
      return sameDomainCandidate;
    }
    const owners = unqualifiedOwners.get(cleanRef);
    if (owners && owners.length === 1) {
      return `${owners[0]}:${cleanRef}`;
    }
    return undefined;
  }

  for (const concept of mergedConcepts) {
    const sourceDomain = String(
      concept.frontmatter.federatedDomain ??
        concept.conceptId.split(":")[0] ??
        "default",
    );

    const relTypes = [
      "depends_on",
      "mitigates",
      "references",
      "supersedes",
    ] as const;

    for (const relType of relTypes) {
      const val = concept.frontmatter[relType];
      const refs = Array.isArray(val)
        ? val.map(String)
        : typeof val === "string"
          ? [val]
          : [];
      for (const ref of refs) {
        const resolved = resolveTargetId(ref, sourceDomain);
        if (resolved && resolved !== concept.conceptId) {
          edges.push({
            sourceConceptId: concept.conceptId,
            targetConceptId: resolved,
            relationType: relType,
          });
          if (!resolved.startsWith(`${sourceDomain}:`)) {
            crossDomainEdgesCount++;
          }
        }
      }
    }

    // Also scan body for [[domain:concept-id]] or [[concept-id]]
    const wikiMatches = concept.body.matchAll(/\[\[([^\]]+)\]\]/g);
    for (const match of wikiMatches) {
      const refStr = match[1];
      if (!refStr) continue;
      const resolved = resolveTargetId(refStr, sourceDomain);
      if (resolved && resolved !== concept.conceptId) {
        const duplicate = edges.some(
          (e) =>
            e.sourceConceptId === concept.conceptId &&
            e.targetConceptId === resolved,
        );
        if (!duplicate) {
          edges.push({
            sourceConceptId: concept.conceptId,
            targetConceptId: resolved,
            relationType: "references",
          });
          if (!resolved.startsWith(`${sourceDomain}:`)) {
            crossDomainEdgesCount++;
          }
        }
      }
    }
  }

  const nodes: FederatedGraphNode[] = mergedConcepts.map((c) => ({
    conceptId: c.conceptId,
    type: c.type,
    title: String(c.frontmatter.title ?? c.conceptId),
    sensitivity: (c.frontmatter.sensitivity ?? "internal") as
      "public" | "internal" | "confidential" | "restricted",
    status: String(c.frontmatter.status ?? "active"),
  }));

  const impactMap = computeImpactMap(edges);
  const graph: FederatedSemanticGraph = {
    version: "1.0",
    generatedAt: new Date(0).toISOString(),
    nodes,
    edges,
    impactMap,
  };

  const composedIr: AgentKnowledgeIR = {
    irVersion: "1.0.0",
    okfVersion: "0.1.0",
    bundleId: "federated-mesh",
    buildId: "federated-build",
    timestamp: new Date(0).toISOString(),
    concepts: mergedConcepts,
    policies: {},
    capabilities: [],
  };

  if (options.outputDir && errors.length === 0) {
    const outDir = path.resolve(options.outputDir);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, "federated-ir.json"),
      JSON.stringify(composedIr, null, 2),
      "utf-8",
    );
    fs.writeFileSync(
      path.join(outDir, "federated-graph.json"),
      JSON.stringify(graph, null, 2),
      "utf-8",
    );
  }

  return {
    ok: errors.length === 0,
    composedAt: new Date().toISOString(),
    domains: domainNames,
    totalConcepts: mergedConcepts.length,
    crossDomainEdgesCount,
    collisions,
    ir: composedIr,
    graph,
    errors,
  };
}
