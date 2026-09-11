import { describe, it, expect } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);
const cliPath = path.resolve(__dirname, "../../dist/index.js");
const workspaceRoot = path.resolve(__dirname, "../../../..");

describe("CLI diff Command", () => {
  if (!fs.existsSync(cliPath)) {
    console.warn("[WARN] CLI binary not found. Skipping diff tests.");
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

  it("should show diff help", async () => {
    const output = await runCli("diff --help");
    expect(output).toContain("Show semantic and governance differences");
    expect(output).toContain("--format <type>");
    expect(output).toContain("--strict");
  });

  it("should diff two domains with text output", async () => {
    const output = await runCli(
      "diff examples/domains/career examples/domains/it-operations --format text",
    );
    expect(output).toContain("AKCP Semantic & Policy Diff");
    expect(output).toContain("BREAKING CHANGES DETECTED");
    expect(output).toContain("WALKTHROUGH");
    expect(output).toContain("Summary:");
  });

  it("should diff two domains with json output", async () => {
    const output = await runCli(
      "diff examples/domains/career examples/domains/it-operations --format json",
    );
    // Extract JSON from output (ignoring [INFO] logs)
    const jsonStart = output.indexOf("{");
    const jsonString = output.slice(jsonStart);
    const parsed = JSON.parse(jsonString);
    expect(parsed).toHaveProperty("concepts");
    expect(parsed).toHaveProperty("capabilities");
    expect(parsed).toHaveProperty("isBreaking");
    expect(parsed.isBreaking).toBe(true);
  });

  it("should diff two domains with markdown output", async () => {
    const output = await runCli(
      "diff examples/domains/career examples/domains/it-operations --format markdown",
    );
    expect(output).toContain("## 🔍 AKCP Semantic & Governance Diff Report");
    expect(output).toContain("Change Summary");
    expect(output).toContain("| **Concepts** |");
  });

  it("should exit with code 1 when --strict is passed on breaking changes", async () => {
    const output = await runCliError(
      "diff examples/domains/career examples/domains/it-operations --strict",
    );
    expect(output).toContain("Breaking governance changes detected in diff");
  });
});
