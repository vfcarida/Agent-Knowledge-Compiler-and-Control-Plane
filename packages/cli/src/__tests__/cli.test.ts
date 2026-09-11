import { describe, it, expect } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";

const execAsync = promisify(exec);
const cliPath = path.resolve(__dirname, "../../dist/index.js");
const workspaceRoot = path.resolve(__dirname, "../../../..");

describe("CLI Smoke Tests", () => {
  // Ensure the CLI is built before running these tests
  if (!fs.existsSync(cliPath)) {
    console.warn(
      `[WARN] CLI binary not found at ${cliPath}. Skipping smoke tests.`,
    );
    return;
  }

  const runCli = async (args: string) => {
    const { stdout, stderr } = await execAsync(`node ${cliPath} ${args}`, {
      encoding: "utf-8",
      cwd: workspaceRoot,
    });
    return stdout + stderr;
  };

  const runCliError = async (args: string) => {
    try {
      const { stdout, stderr } = await execAsync(`node ${cliPath} ${args}`, {
        encoding: "utf-8",
        cwd: workspaceRoot,
      });
      return stdout + stderr;
    } catch (e: any) {
      return (e.stderr || "") + (e.stdout || "") + (e.message || "");
    }
  };

  it("should output help for akcp --help", async () => {
    const output = await runCli("--help");
    expect(output).toContain("Agent Knowledge Compiler and Control Plane CLI");
    expect(output).toContain("init [options] [directory]");
    expect(output).toContain("validate [options] [directory]");
    expect(output).toContain("compile [options]");
    expect(output).toContain("inspect [options]");
    expect(output).toContain("serve");
    expect(output).toContain("evals");
    expect(output).toContain("conformance");
    expect(output).toContain("docs");
  });

  it("should output help for validate command", async () => {
    const output = await runCli("validate --help");
    expect(output).toContain("--bundle <directory>");
  });

  it("should output help for compile command", async () => {
    const output = await runCli("compile --help");
    expect(output).toContain("--config <path>");
  });

  it("should output help for inspect command", async () => {
    const output = await runCli("inspect --help");
    expect(output).toContain("--artifact <path>");
  });

  it("should fail validation with invalid directory", async () => {
    const output = await runCliError("validate --bundle does-not-exist");
    expect(output).toContain("Directory not found");
  });

  it("should fail compilation if config is missing", async () => {
    const output = await runCliError("compile --config does-not-exist");
    expect(output).toContain("Configuration file not found");
  });

  it("should throw error for unsupported targets", async () => {
    const tmpFile = path.join(os.tmpdir(), "akcp-test-invalid.yaml");
    fs.writeFileSync(
      tmpFile,
      "compile:\n  sources:\n    - path: .\n  targets:\n    - type: invalid-target",
    );
    const output = await runCliError(`compile --config ${tmpFile}`);
    expect(output).toContain("Configuration validation failed");
    expect(output).toContain("Invalid enum value");
  });

  it("should output help for scan command", async () => {
    const output = await runCli("scan --help");
    expect(output).toContain("Analyze repository");
  });

  it("should output help for verify command", async () => {
    const output = await runCli("verify --help");
    expect(output).toContain("Verify the cryptographic provenance");
  });

  it("should output help for diff command", async () => {
    const output = await runCli("diff --help");
    expect(output).toContain("diff [options]");
  });

  it("should output help for import command", async () => {
    const output = await runCli("import --help");
    expect(output).toContain("import [options] <source>");
  });

  it("should output help for serve mcp command", async () => {
    const output = await runCli("serve mcp --help");
    expect(output).toContain("serve mcp [options]");
  });

  it("should output help for control-plane command", async () => {
    const output = await runCli("control-plane --help");
    expect(output).toContain("control-plane [options] [command]");
  });

  it("should output help for evals command", async () => {
    const output = await runCli("evals --help");
    expect(output).toContain("evals [options] [command]");
  });

  it("should output help for docs command", async () => {
    const output = await runCli("docs --help");
    expect(output).toContain("docs [options] [command]");
  });

  it("should output help for doctor command", async () => {
    const output = await runCli("doctor --help");
    expect(output).toContain("doctor [options]");
  });

  it("should output help for agents command", async () => {
    const output = await runCli("agents --help");
    expect(output).toContain("agents [options] [command]");
  });

  it("should output help for config command", async () => {
    const output = await runCli("config --help");
    expect(output).toContain("config [options] [command]");
  });

  it("should output help for policy command", async () => {
    const output = await runCli("policy --help");
    expect(output).toContain("policy [options] [command]");
  });

  it("should output help for plan command", async () => {
    const output = await runCli("plan --help");
    expect(output).toContain("plan [options]");
  });

  it("should output help for reconcile command", async () => {
    const output = await runCli("reconcile --help");
    expect(output).toContain("reconcile [options]");
  });

  it("should output help for graph command", async () => {
    const output = await runCli("graph --help");
    expect(output).toContain("graph [options] [command]");
  });

  it("should output help for context command", async () => {
    const output = await runCli("context --help");
    expect(output).toContain("context [options] [command]");
  });

  it("should output help for lifecycle command", async () => {
    const output = await runCli("lifecycle --help");
    expect(output).toContain("lifecycle [options] [command]");
  });

  it("should output help for conformance command", async () => {
    const output = await runCli("conformance --help");
    expect(output).toContain("conformance [options] [command]");
  });

  it("should output help for scorecard command", async () => {
    const output = await runCli("scorecard --help");
    expect(output).toContain("scorecard [options]");
  });

  it("should output help for plugin command", async () => {
    const output = await runCli("plugin --help");
    expect(output).toContain("plugin [options] [command]");
  });

  it("should output help for privacy command", async () => {
    const output = await runCli("privacy --help");
    expect(output).toContain("privacy [options] [command]");
  });

  it("should execute diff command between domains", async () => {
    const output = await runCli(
      "diff examples/domains/career examples/domains/it-operations --format text",
    );
    expect(output).toContain("AKCP Semantic & Policy Diff");
    expect(output).toContain("Concepts:");
  });

  describe("Control Plane Commands", () => {
    it("should output help for serve dashboard command", async () => {
      const output = await runCli("serve dashboard --help");
      expect(output).toContain("Launch the AKCP Control Plane Dashboard");
      expect(output).toContain("--port <number>");
    });

    it("should output help for control-plane inspect command", async () => {
      const output = await runCli("control-plane inspect --help");
      expect(output).toContain("Inspect runtime governance state");
      expect(output).toContain("--ir <path>");
    });

    it("should output help for control-plane policies command", async () => {
      const output = await runCli("control-plane policies --help");
      expect(output).toContain("List registered policy cards");
      expect(output).toContain("--provider <type>");
    });

    it("should output help for control-plane approvals command", async () => {
      const output = await runCli("control-plane approvals --help");
      expect(output).toContain(
        "List and inspect pending and historic HITL approval requests",
      );
      expect(output).toContain("--status <status>");
    });

    it("should output help for control-plane audit command", async () => {
      const output = await runCli("control-plane audit --help");
      expect(output).toContain("Query or tail the runtime audit log events");
      expect(output).toContain("--lines <number>");
    });
  });
});
