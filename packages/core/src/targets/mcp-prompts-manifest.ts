import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { CompileTarget, TargetConfig, TargetOutput } from "./types.js";
import type { AgentKnowledgeIR } from "../ir/types.js";

/**
 * Generates an MCP-compatible Prompts Manifest JSON from compiled AgentKnowledgeIR
 * prompt capabilities and structured knowledge concepts.
 */
export class McpPromptsManifestTarget implements CompileTarget {
  public readonly targetType = "mcp-prompts-manifest";

  async compile(
    ir: AgentKnowledgeIR,
    config: TargetConfig,
  ): Promise<TargetOutput> {
    const outPath = path.resolve(process.cwd(), config.out);
    const outDir = path.dirname(outPath);

    await fs.mkdir(outDir, { recursive: true });

    const capabilityPrompts = (ir.capabilities || [])
      .filter((c) => typeof c === "object" && c !== null && c.kind === "prompt")
      .map((c) => ({
        name: c.name,
        description: c.description,
        version: c.version,
        arguments: Object.keys(
          (c.inputsSchema?.properties as Record<string, unknown>) || {},
        ).map((argName) => ({
          name: argName,
          required: Array.isArray(c.inputsSchema?.required)
            ? (c.inputsSchema.required as string[]).includes(argName)
            : false,
        })),
      }));

    const conceptPrompts = ir.concepts.map((c) => {
      const title =
        typeof c.frontmatter?.title === "string"
          ? c.frontmatter.title
          : c.conceptId;
      return {
        name: `consult_${c.conceptId.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
        description: `Grounded prompt template for ${title} (${c.type})`,
        conceptId: c.conceptId,
        type: c.type,
        arguments: [
          {
            name: "task",
            description:
              "The user task or query to ground against this concept",
            required: true,
          },
        ],
      };
    });

    const manifest = {
      version: "1.0",
      bundleId: ir.bundleId,
      prompts: [...capabilityPrompts, ...conceptPrompts],
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
