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
    execSync(
      `node ${path.resolve(__dirname, "../../dist/index.js")} init --profile career --output ${tmpDir}/test-career`,
      {
        cwd: tmpDir,
      },
    );

    expect(fs.existsSync(path.join(tmpDir, "test-career", "akcp.yaml"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(tmpDir, "test-career", "sources"))).toBe(
      true,
    );
  });

  it("should create a valid it-operations bundle", () => {
    execSync(
      `node ${path.resolve(__dirname, "../../dist/index.js")} init --profile it-operations --output ${tmpDir}/test-itops`,
      {
        cwd: tmpDir,
      },
    );

    expect(fs.existsSync(path.join(tmpDir, "test-itops", "akcp.yaml"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(tmpDir, "test-itops", "policies"))).toBe(
      true,
    );
  });

  it("should validate the generated bundle", () => {
    execSync(
      `node ${path.resolve(__dirname, "../../dist/index.js")} init --profile career --output ${tmpDir}/test-validate`,
      {
        cwd: tmpDir,
      },
    );

    // The generated bundle should pass validation
    const result = execSync(
      `node ${path.resolve(__dirname, "../../dist/index.js")} validate --bundle ${tmpDir}/test-validate --profile career`,
      {
        cwd: tmpDir,
        encoding: "utf-8",
      },
    );

    expect(result).not.toContain("ERROR");
  });

  it("should support --template customer-support", () => {
    execSync(
      `node ${path.resolve(__dirname, "../../dist/index.js")} init --template customer-support --output ${tmpDir}/test-cs`,
      {
        cwd: tmpDir,
      },
    );

    expect(fs.existsSync(path.join(tmpDir, "test-cs", "akcp.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, "test-cs", "policies"))).toBe(true);
  });

  it("should support interactive mode wizard with custom inputs", () => {
    const customTarget = path.join(tmpDir, "custom-interactive-bundle");
    // Inputs: template, directory, autonomy
    const input = `customer-support\n${customTarget}\nautonomous\n`;

    execSync(`node ${path.resolve(__dirname, "../../dist/index.js")} init -i`, {
      cwd: tmpDir,
      input,
    });

    expect(fs.existsSync(path.join(customTarget, "akcp.yaml"))).toBe(true);
    const akcpYaml = fs.readFileSync(
      path.join(customTarget, "akcp.yaml"),
      "utf-8",
    );
    expect(akcpYaml).toContain("defaultAutonomyLevel: autonomous");
  });

  it("should support interactive mode wizard with default enter selections", () => {
    // Pressing enter on all prompts defaults to it-operations, ./my-it-operations, human-in-the-loop
    const input = `\n\n\n`;

    execSync(`node ${path.resolve(__dirname, "../../dist/index.js")} init -i`, {
      cwd: tmpDir,
      input,
    });

    const defaultDir = path.join(tmpDir, "my-it-operations");
    expect(fs.existsSync(path.join(defaultDir, "akcp.yaml"))).toBe(true);
    const akcpYaml = fs.readFileSync(
      path.join(defaultDir, "akcp.yaml"),
      "utf-8",
    );
    expect(akcpYaml).toContain("defaultAutonomyLevel: human-in-the-loop");
  });
});
