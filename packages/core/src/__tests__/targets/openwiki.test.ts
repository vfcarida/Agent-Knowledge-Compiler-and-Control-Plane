import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenWikiDocsTarget } from "../../targets/openwiki-docs.js";
import fs from "node:fs/promises";
import path from "node:path";
import type { AgentKnowledgeIR } from "../../ir/types.js";

vi.mock("node:fs/promises");

describe("OpenWikiDocsTarget", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should preserve frontmatter and emit metadata json", async () => {
    const target = new OpenWikiDocsTarget();
    
    const ir: AgentKnowledgeIR = {
      irVersion: "1.0",
      okfVersion: "0.1",
      bundleId: "test-bundle",
      buildId: "bld_123",
      timestamp: new Date().toISOString(),
      concepts: [
        {
          conceptId: "skills/test",
          type: "Skill",
          source: { filePath: "test.md", format: "okf/markdown" },
          frontmatter: {
            type: "Skill",
            unknown_key: 123
          },
          body: "Hello World",
          budget: { byteSize: 10, estimatedTokens: 3 }
        }
      ]
    };

    const outDir = "./dist/openwiki";
    await target.compile(ir, { type: "openwiki", out: outDir });

    expect(fs.mkdir).toHaveBeenCalledWith(path.resolve(process.cwd(), outDir), { recursive: true });
    
    // Check that frontmatter was written
    const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
    
    const fileCall = writeFileCalls.find(call => call[0].toString().includes("skills-test.md"));
    expect(fileCall).toBeDefined();
    const fileContent = fileCall![1] as string;
    expect(fileContent).toContain("type: Skill");
    expect(fileContent).toContain("unknown_key: 123");
    expect(fileContent).toContain("# skills/test\n\nHello World");

    // Check that metadata was written
    const metaCall = writeFileCalls.find(call => call[0].toString().includes(".akcp-openwiki-metadata.json"));
    expect(metaCall).toBeDefined();
    const metaContent = JSON.parse(metaCall![1] as string);
    expect(metaContent.bundleId).toBe("test-bundle");
    expect(metaContent.targetType).toBe("openwiki");
  });
});
