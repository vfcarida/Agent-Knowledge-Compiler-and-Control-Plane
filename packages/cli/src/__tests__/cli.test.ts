import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

const cliPath = path.resolve(__dirname, "../../dist/index.js");
const workspaceRoot = path.resolve(__dirname, "../../../..");

describe("CLI Smoke Tests", () => {
  // Ensure the CLI is built before running these tests
  if (!fs.existsSync(cliPath)) {
    console.warn(`[WARN] CLI binary not found at ${cliPath}. Skipping smoke tests.`);
    return;
  }

  const runCli = (args: string) => {
    return execSync(`node ${cliPath} ${args}`, { encoding: "utf-8", stdio: "pipe", cwd: workspaceRoot });
  };

  const runCliError = (args: string) => {
    try {
      execSync(`node ${cliPath} ${args}`, { encoding: "utf-8", stdio: "pipe", cwd: workspaceRoot });
      throw new Error("Expected command to fail");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      return (e.stderr || "") + (e.stdout || "") + (e.message || "");
    }
  };

  it("should output help for akcp --help", () => {
    const output = runCli("--help");
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

  it("should output help for validate command", () => {
    const output = runCli("validate --help");
    expect(output).toContain("--bundle <directory>");
  });

  it("should output help for compile command", () => {
    const output = runCli("compile --help");
    expect(output).toContain("--config <path>");
  });

  it("should output help for inspect command", () => {
    const output = runCli("inspect --help");
    expect(output).toContain("--artifact <path>");
  });

  it("should fail validation with invalid directory", () => {
    const output = runCliError("validate --bundle does-not-exist");
    expect(output).toContain("Directory not found");
  });

  it("should fail compilation if config is missing", () => {
    const output = runCliError("compile --config does-not-exist");
    expect(output).toContain("Configuration file not found");
  });

  it("should throw error for unsupported targets", () => {
    const tmpFile = path.join(os.tmpdir(), "akcp-test-invalid.yaml");
    fs.writeFileSync(tmpFile, "compile:\n  sources:\n    - path: .\n  targets:\n    - type: invalid-target");
    const output = runCliError(`compile --config ${tmpFile}`);
    expect(output).toContain("Configuration validation failed");
    expect(output).toContain("Invalid enum value");
  });

  // Adding smoke tests for remaining commands
  it("should output help for scan command", () => {
    const output = runCli("scan --help");
    expect(output).toContain("Analyze repository");
  });

  it("should output help for verify command", () => {
    const output = runCli("verify --help");
    expect(output).toContain("Verify the cryptographic provenance");
  });

  it("should output help for diff command", () => {
    const output = runCli("diff --help");
    expect(output).toContain("diff [options] [directory]");
  });

  it("should output help for import command", () => {
    const output = runCli("import --help");
    expect(output).toContain("import [options] <source>");
  });

  it("should output help for serve mcp command", () => {
    const output = runCli("serve mcp --help");
    expect(output).toContain("serve mcp [options]");
  });

  it("should output help for control-plane command", () => {
    const output = runCli("control-plane --help");
    expect(output).toContain("control-plane [options] [command]");
  });

  it("should output help for evals command", () => {
    const output = runCli("evals --help");
    expect(output).toContain("evals [options] [command]");
  });

  it("should output help for docs command", () => {
    const output = runCli("docs --help");
    expect(output).toContain("docs [options] [command]");
  });

  it("should output help for doctor command", () => {
    const output = runCli("doctor --help");
    expect(output).toContain("doctor [options]");
  });

  it("should output help for agents command", () => {
    const output = runCli("agents --help");
    expect(output).toContain("agents [options] [command]");
  });

  it("should output help for config command", () => {
    const output = runCli("config --help");
    expect(output).toContain("config [options] [command]");
  });

  it("should output help for policy command", () => {
    const output = runCli("policy --help");
    expect(output).toContain("policy [options] [command]");
  });

  it("should output help for plan command", () => {
    const output = runCli("plan --help");
    expect(output).toContain("plan [options]");
  });

  it("should output help for reconcile command", () => {
    const output = runCli("reconcile --help");
    expect(output).toContain("reconcile [options]");
  });

  it("should output help for graph command", () => {
    const output = runCli("graph --help");
    expect(output).toContain("graph [options] [command]");
  });

  it("should output help for context command", () => {
    const output = runCli("context --help");
    expect(output).toContain("context [options] [command]");
  });

  it("should output help for lifecycle command", () => {
    const output = runCli("lifecycle --help");
    expect(output).toContain("lifecycle [options] [command]");
  });

  it("should output help for conformance command", () => {
    const output = runCli("conformance --help");
    expect(output).toContain("conformance [options] [command]");
  });

  it("should output help for scorecard command", () => {
    const output = runCli("scorecard --help");
    expect(output).toContain("scorecard [options]");
  });

  it("should output help for plugin command", () => {
    const output = runCli("plugin --help");
    expect(output).toContain("plugin [options] [command]");
  });

  it("should output help for privacy command", () => {
    const output = runCli("privacy --help");
    expect(output).toContain("privacy [options] [command]");
  });

  describe("Placeholder Commands (Prompt 05)", () => {
    it("should fail diff command with NOT_IMPLEMENTED", () => {
      const output = runCliError("diff");
      expect(output).toContain("NOT_IMPLEMENTED: The diff command is a planned feature");
    });

    it("should fail serve dashboard command with NOT_IMPLEMENTED", () => {
      const output = runCliError("serve dashboard");
      expect(output).toContain("NOT_IMPLEMENTED: The dashboard is a planned feature");
    });

    it("should fail control-plane inspect command with NOT_IMPLEMENTED", () => {
      const output = runCliError("control-plane inspect");
      expect(output).toContain("NOT_IMPLEMENTED: The control-plane inspect command");
    });

    it("should fail control-plane policies command with NOT_IMPLEMENTED", () => {
      const output = runCliError("control-plane policies");
      expect(output).toContain("NOT_IMPLEMENTED: The control-plane policies command");
    });
  });
});
