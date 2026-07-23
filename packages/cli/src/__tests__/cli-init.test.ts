import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("akcp init", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "akcp-init-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should create a valid career bundle", () => {
    execSync(`node ${path.resolve(__dirname, "../../dist/index.js")} init --profile career --output ${tmpDir}/test-career`, {
      cwd: tmpDir,
    });

    expect(fs.existsSync(path.join(tmpDir, "test-career", "akcp.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "test-career", "sources"))).toBe(true);
  });

  it("should create a valid it-operations bundle", () => {
    execSync(`node ${path.resolve(__dirname, "../../dist/index.js")} init --profile it-operations --output ${tmpDir}/test-itops`, {
      cwd: tmpDir,
    });

    expect(fs.existsSync(path.join(tmpDir, "test-itops", "akcp.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "test-itops", "policies"))).toBe(true);
  });

  it("should validate the generated bundle", () => {
    execSync(`node ${path.resolve(__dirname, "../../dist/index.js")} init --profile career --output ${tmpDir}/test-validate`, {
      cwd: tmpDir,
    });

    // The generated bundle should pass validation
    const result = execSync(`node ${path.resolve(__dirname, "../../dist/index.js")} validate --bundle ${tmpDir}/test-validate --profile career`, {
      cwd: tmpDir,
      encoding: "utf-8",
    });

    expect(result).not.toContain("ERROR");
  });
});
