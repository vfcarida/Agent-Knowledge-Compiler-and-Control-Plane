import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { CompileTarget, TargetConfig, TargetOutput } from "./types.js";
import type { AgentKnowledgeIR } from "../ir/types.js";

/**
 * Generates an MCP-compatible Tools Manifest JSON from compiled AgentKnowledgeIR
 * capabilities and built-in profile discovery tools.
 */
export class McpToolsManifestTarget implements CompileTarget {
  public readonly targetType = "mcp-tools-manifest";

  async compile(
    ir: AgentKnowledgeIR,
    config: TargetConfig,
  ): Promise<TargetOutput> {
    const outPath = path.resolve(process.cwd(), config.out);
    const outDir = path.dirname(outPath);

    await fs.mkdir(outDir, { recursive: true });

    const capabilityTools = (ir.capabilities || [])
      .filter((c) => typeof c === "object" && c !== null && c.kind === "tool")
      .map((c) => ({
        id: c.id,
        name: c.name,
        version: c.version,
        description: c.description,
        inputSchema: c.inputsSchema || {
          type: "object",
          properties: {},
        },
        outputSchema: c.outputsSchema || {
          type: "object",
          properties: {},
        },
        annotations: {
          riskLevel: c.riskLevel,
          sideEffects: c.sideEffects,
          requiresApproval: Boolean(c.requiresApproval),
          readsPII: Boolean(c.readsPII),
          writesPII: Boolean(c.writesPII),
          policyRefs: c.policyRefs || [],
        },
      }));

    const builtInTools = [
      {
        id: "akcp.profile.list_documents",
        name: "list_documents",
        version: "0.1.0",
        description:
          "List available compiled knowledge documents and filter by concept type.",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              description: "Optional OKF concept type filter",
            },
          },
        },
        outputSchema: {
          type: "object",
          properties: {
            documents: { type: "array" },
          },
        },
        annotations: {
          riskLevel: "low",
          sideEffects: "none",
          requiresApproval: false,
          readsPII: false,
          writesPII: false,
          policyRefs: [],
        },
      },
      {
        id: "akcp.profile.read_document",
        name: "read_document",
        version: "0.1.0",
        description:
          "Retrieve a specific compiled knowledge document by its conceptId.",
        inputSchema: {
          type: "object",
          required: ["conceptId"],
          properties: {
            conceptId: {
              type: "string",
              description: "Target concept identifier",
            },
          },
        },
        outputSchema: {
          type: "object",
          properties: {
            conceptId: { type: "string" },
            frontmatter: { type: "object" },
            body: { type: "string" },
          },
        },
        annotations: {
          riskLevel: "low",
          sideEffects: "local-read",
          requiresApproval: false,
          readsPII: false,
          writesPII: false,
          policyRefs: [],
        },
      },
    ];

    const manifest = {
      version: "1.0",
      bundleId: ir.bundleId,
      tools: [...builtInTools, ...capabilityTools],
    };

    const content = JSON.stringify(manifest, null, 2);

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
