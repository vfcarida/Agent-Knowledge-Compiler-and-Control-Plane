import { describe, it, expect, vi, beforeEach } from "vitest";
import { IncrementalCompiler } from "../../compiler/incremental-build-state.js";
import fs from "node:fs";

vi.mock("node:fs");

describe("IncrementalCompiler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return true for shouldCompile if source hash has changed", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
      "file1.md": {
        sourceHash: "hash123",
        artifactHash: "art123",
        lastCompiledAt: "2023-01-01T00:00:00Z",
        dependencies: []
      }
    }));

    const compiler = new IncrementalCompiler("/test/dir");
    expect(compiler.shouldCompile("file1.md", "hash123")).toBe(false);
    expect(compiler.shouldCompile("file1.md", "hash456")).toBe(true);
    expect(compiler.shouldCompile("file2.md", "hash123")).toBe(true);
  });
  
  it("should update state and save correctly", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false); // No existing cache
    
    const compiler = new IncrementalCompiler("/test/dir");
    compiler.updateState("newfile.md", "srchash", "arthash", []);
    
    compiler.saveState();
    
    expect(fs.writeFileSync).toHaveBeenCalled();
    const callArgs = vi.mocked(fs.writeFileSync).mock.calls[0];
    expect(callArgs[0]).toContain("build-state.json");
    expect(callArgs[1]).toContain("srchash");
  });
});
