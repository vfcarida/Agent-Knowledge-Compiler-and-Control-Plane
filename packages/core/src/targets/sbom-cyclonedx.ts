import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { CompileTarget, TargetConfig, TargetOutput } from "./types.js";
import type { AgentKnowledgeIR } from "../ir/types.js";

export interface CycloneDxComponent {
  type: "data" | "service" | "library";
  "bom-ref": string;
  name: string;
  version: string;
  description?: string;
  hashes?: Array<{ alg: "SHA-256"; content: string }>;
  properties?: Array<{ name: string; value: string }>;
}

export interface CycloneDxBom {
  bomFormat: "CycloneDX";
  specVersion: "1.5";
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    tools: Array<{ vendor: string; name: string; version: string }>;
    component: {
      type: "data";
      "bom-ref": string;
      name: string;
      version: string;
    };
  };
  components: CycloneDxComponent[];
  dependencies: Array<{ ref: string; dependsOn: string[] }>;
}

/**
 * Generates a CycloneDX v1.5 Knowledge & AI Bill of Materials (KBOM/SBOM) JSON document
 * from an AgentKnowledgeIR, inventorying all OKF concepts, MCP capabilities, SHA-256 hashes,
 * risk classifications, and semantic graph dependency relationships.
 */
export function buildCycloneDxKbom(ir: AgentKnowledgeIR): CycloneDxBom {
  const bundleRef = `pkg:akcp/bundle/${ir.bundleId}@${ir.okfVersion}`;
  const components: CycloneDxComponent[] = [];
  const rootDependsOn: string[] = [];

  for (const concept of ir.concepts) {
    const ref = `pkg:akcp/concept/${concept.conceptId}`;
    rootDependsOn.push(ref);

    const version =
      typeof concept.frontmatter?.version === "string"
        ? concept.frontmatter.version
        : "1.0.0";
    const sensitivity =
      typeof concept.frontmatter?.sensitivity === "string"
        ? concept.frontmatter.sensitivity
        : "internal";

    const contentHash =
      concept.source.hash ||
      createHash("sha256").update(concept.body, "utf8").digest("hex");

    components.push({
      type: "data",
      "bom-ref": ref,
      name: concept.conceptId,
      version,
      hashes: [{ alg: "SHA-256", content: contentHash }],
      properties: [
        { name: "akcp:conceptType", value: concept.type },
        { name: "akcp:status", value: concept.status ?? "active" },
        { name: "akcp:sensitivity", value: sensitivity },
        {
          name: "akcp:estimatedTokens",
          value: String(concept.budget.estimatedTokens),
        },
      ],
    });
  }

  for (const cap of ir.capabilities ?? []) {
    const ref = `pkg:akcp/capability/${cap.id}@${cap.version}`;
    rootDependsOn.push(ref);

    components.push({
      type: "service",
      "bom-ref": ref,
      name: cap.name,
      version: cap.version,
      description: cap.description,
      properties: [
        { name: "akcp:capabilityKind", value: cap.kind },
        { name: "akcp:riskLevel", value: cap.riskLevel },
        { name: "akcp:sideEffects", value: cap.sideEffects },
        {
          name: "akcp:requiresApproval",
          value: String(Boolean(cap.requiresApproval)),
        },
      ],
    });
  }

  const depMap = new Map<string, Set<string>>();
  for (const concept of ir.concepts) {
    depMap.set(`pkg:akcp/concept/${concept.conceptId}`, new Set<string>());
  }

  for (const link of ir.links ?? []) {
    const srcRef = `pkg:akcp/concept/${link.sourceConceptId}`;
    const tgtRef = `pkg:akcp/concept/${link.targetConceptId}`;
    if (!depMap.has(srcRef)) {
      depMap.set(srcRef, new Set<string>());
    }
    depMap.get(srcRef)!.add(tgtRef);
  }

  const dependencies: Array<{ ref: string; dependsOn: string[] }> = [
    {
      ref: bundleRef,
      dependsOn: rootDependsOn,
    },
  ];

  for (const [ref, deps] of depMap.entries()) {
    dependencies.push({
      ref,
      dependsOn: Array.from(deps).sort(),
    });
  }

  // Deterministic UUID-like serial derived from bundleId + buildId
  const serialDigest = createHash("sha256")
    .update(`${ir.bundleId}:${ir.buildId}`)
    .digest("hex");
  const serialUuid = `${serialDigest.slice(0, 8)}-${serialDigest.slice(8, 12)}-4${serialDigest.slice(13, 16)}-a${serialDigest.slice(17, 20)}-${serialDigest.slice(20, 32)}`;

  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${serialUuid}`,
    version: 1,
    metadata: {
      timestamp: ir.timestamp,
      tools: [
        {
          vendor: "AKCP",
          name: "Agent Knowledge Compiler and Control Plane",
          version: ir.irVersion,
        },
      ],
      component: {
        type: "data",
        "bom-ref": bundleRef,
        name: ir.bundleId,
        version: ir.okfVersion,
      },
    },
    components,
    dependencies,
  };
}

export class SbomCycloneDxTarget implements CompileTarget {
  public readonly targetType = "sbom-cyclonedx";

  async compile(
    ir: AgentKnowledgeIR,
    config: TargetConfig,
  ): Promise<TargetOutput> {
    const outPath = path.resolve(process.cwd(), config.out);
    const outDir = path.dirname(outPath);

    await fs.mkdir(outDir, { recursive: true });

    const bom = buildCycloneDxKbom(ir);
    const content = JSON.stringify(bom, null, 2);

    await fs.writeFile(outPath, content, "utf-8");

    const hash = createHash("sha256").update(content).digest("hex");
    const bytesWritten = Buffer.byteLength(content, "utf8");

    return {
      targetType: this.targetType,
      outputPath: outPath,
      hash,
      bytesWritten,
    };
  }
}
