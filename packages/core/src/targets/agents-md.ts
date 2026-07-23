import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { CompileTarget, TargetConfig, TargetOutput } from "./types.js";
import type { AgentKnowledgeIR } from "../ir/types.js";

export class AgentsMdTarget implements CompileTarget {
  public readonly targetType = "agent-instructions";

  async compile(
    ir: AgentKnowledgeIR,
    config: TargetConfig,
  ): Promise<TargetOutput> {
    const outPath = path.resolve(process.cwd(), config.out);
    const outDir = path.dirname(outPath);

    await fs.mkdir(outDir, { recursive: true });

    // Generates a snippet to be appended to AGENTS.md or CLAUDE.md
    const content = `<!-- akcp:start -->
> **⚠️ MANAGED CONTEXT BLOCK ⚠️**
> The contents of this block are automatically synchronized by \`akcp agents sync\`.
> Do not edit this block manually. Place custom instructions outside these markers.

## 1. Project Purpose
Compiled from Context Ops Bundle: ${ir.bundleId}

## 2. Context Sources
This bundle contains ${ir.concepts.length} concepts and ${(ir.links || []).length} relationships.
Always consult the MCP Profile Server tools (\`list_documents\`, \`read_document\`) before answering questions.

## 3. Capabilities
The following MCP capabilities are active:
${(ir.capabilities || []).map((c) => `- ${c}`).join("\n")}

<!-- akcp:end -->
`;

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
