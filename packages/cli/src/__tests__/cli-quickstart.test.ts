import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliEntry = path.resolve(__dirname, "../../dist/index.js");

describe("akcp quickstart", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "akcp-quickstart-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should display quickstart options in help", () => {
    const output = execSync(`node "${cliEntry}" quickstart --help`, {
      encoding: "utf-8",
    });

    expect(output).toContain("Bootstrap an agent knowledge bundle");
    expect(output).toContain("--template");
    expect(output).toContain("--no-serve");
    expect(output).toContain("--port");
  });

  it("should bootstrap, compile and emit targets with --no-serve for default it-operations", () => {
    const targetDir = path.join(tmpDir, "quickstart-itops");
    const output = execSync(
      `node "${cliEntry}" quickstart "${targetDir}" --no-serve`,
      {
        cwd: tmpDir,
        encoding: "utf-8",
      },
    );

    expect(output).toContain("AKCP Quickstart: Zero-to-Control-Plane");
    expect(output).toContain(
      "Compiling knowledge artifacts to Agent Knowledge IR",
    );
    expect(output).toContain(
      "Quickstart setup completed (--no-serve specified)",
    );

    expect(fs.existsSync(path.join(targetDir, "akcp.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "AGENTS.md"))).toBe(true);
    expect(
      fs.existsSync(path.join(targetDir, "dist", "agent-knowledge-ir.json")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(targetDir, "dist", "mcp-resources.json")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(targetDir, "dist", "policy-bundle.json")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(targetDir, "dist", "akcp", "dashboard-metadata.json"),
      ),
    ).toBe(true);

    const irJson = JSON.parse(
      fs.readFileSync(
        path.join(targetDir, "dist", "agent-knowledge-ir.json"),
        "utf-8",
      ),
    );
    expect(irJson.bundleId).toBeDefined();
    expect(irJson.concepts.length).toBeGreaterThan(0);
  });

  it("should bootstrap and compile alternative template with --template career", () => {
    const targetDir = path.join(tmpDir, "quickstart-career");
    const output = execSync(
      `node "${cliEntry}" quickstart "${targetDir}" --template career --no-serve`,
      {
        cwd: tmpDir,
        encoding: "utf-8",
      },
    );

    expect(output).toContain(
      "Quickstart setup completed (--no-serve specified)",
    );
    expect(fs.existsSync(path.join(targetDir, "akcp.yaml"))).toBe(true);
    expect(
      fs.existsSync(path.join(targetDir, "dist", "agent-knowledge-ir.json")),
    ).toBe(true);
  });

  it("should support --template customer-support", () => {
    const targetDir = path.join(tmpDir, "quickstart-support");
    const output = execSync(
      `node "${cliEntry}" quickstart "${targetDir}" --template customer-support --no-serve`,
      {
        cwd: tmpDir,
        encoding: "utf-8",
      },
    );

    expect(output).toContain(
      "Quickstart setup completed (--no-serve specified)",
    );
    expect(fs.existsSync(path.join(targetDir, "akcp.yaml"))).toBe(true);
    expect(
      fs.existsSync(path.join(targetDir, "dist", "agent-knowledge-ir.json")),
    ).toBe(true);
  });

  it("should fail gracefully when an invalid template is requested", () => {
    const targetDir = path.join(tmpDir, "quickstart-invalid");
    let failed = false;
    let stderrOutput = "";
    try {
      execSync(
        `node "${cliEntry}" quickstart "${targetDir}" --template non-existent-template-xyz --no-serve`,
        {
          cwd: tmpDir,
          encoding: "utf-8",
          stdio: "pipe",
        },
      );
    } catch (err: any) {
      failed = true;
      stderrOutput = err.stderr || err.stdout || "";
    }

    expect(failed).toBe(true);
    expect(stderrOutput).toContain(
      "Template 'non-existent-template-xyz' not found",
    );
  });

  it("should reuse and recompile an existing bundle if akcp.yaml is already present", () => {
    const targetDir = path.join(tmpDir, "quickstart-existing");
    // Run once to initialize
    execSync(`node "${cliEntry}" quickstart "${targetDir}" --no-serve`, {
      cwd: tmpDir,
      encoding: "utf-8",
    });

    // Run again on the same directory
    const output = execSync(
      `node "${cliEntry}" quickstart "${targetDir}" --no-serve`,
      {
        cwd: tmpDir,
        encoding: "utf-8",
      },
    );

    expect(output).toContain("Using existing bundle found at");
    expect(output).toContain(
      "Quickstart setup completed (--no-serve specified)",
    );
  });
});
