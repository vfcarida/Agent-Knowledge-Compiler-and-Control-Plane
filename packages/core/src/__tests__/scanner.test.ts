import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { scanWorkspace, writeScanSuggestions } from "../scanner/scan.js";

describe("Heuristic Workspace Scanner", () => {
  const tempTestDir = path.resolve("./temp-scanner-test-dir");

  beforeEach(() => {
    if (fs.existsSync(tempTestDir)) {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempTestDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempTestDir)) {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    }
  });

  it("scans a directory and detects Node.js structure", () => {
    fs.writeFileSync(path.join(tempTestDir, "package.json"), "{}");
    fs.writeFileSync(path.join(tempTestDir, "tsconfig.json"), "{}");

    const result = scanWorkspace(tempTestDir);
    expect(result.detectedFiles).toContain("package.json");
    expect(result.detectedFiles).toContain("tsconfig.json");

    const nodeSug = result.suggestions.find(
      (s) => s.fileName === "node-commands.md",
    );
    expect(nodeSug).toBeDefined();
    expect(nodeSug?.type).toBe("playbook");
    expect(nodeSug?.suggestedBody).toContain("npm run dev");
  });

  it("scans a directory and detects Python structure", () => {
    fs.writeFileSync(path.join(tempTestDir, "requirements.txt"), "numpy");

    const result = scanWorkspace(tempTestDir);
    expect(result.detectedFiles).toContain("requirements.txt");

    const pySug = result.suggestions.find(
      (s) => s.fileName === "python-setup.md",
    );
    expect(pySug).toBeDefined();
    expect(pySug?.suggestedBody).toContain("pip install -r requirements.txt");
  });

  it("writes suggestions successfully to target folder", () => {
    fs.writeFileSync(path.join(tempTestDir, "package.json"), "{}");

    const result = scanWorkspace(tempTestDir);
    const outDirName = ".test-agent-context";
    const written = writeScanSuggestions(tempTestDir, result, outDirName);

    expect(written.length).toBeGreaterThan(0);
    const writtenFileBase = path.basename(written[0]);
    const expectedFilePath = path.join(
      tempTestDir,
      outDirName,
      writtenFileBase,
    );
    expect(fs.existsSync(expectedFilePath)).toBe(true);
  });
});
