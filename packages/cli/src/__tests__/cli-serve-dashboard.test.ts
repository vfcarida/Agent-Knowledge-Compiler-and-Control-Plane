import { describe, it, expect } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);
const cliPath = path.resolve(__dirname, "../../dist/index.js");
const workspaceRoot = path.resolve(__dirname, "../../../..");

describe("CLI serve dashboard Command", () => {
  if (!fs.existsSync(cliPath)) {
    console.warn(
      "[WARN] CLI binary not found. Skipping serve dashboard tests.",
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

  it("should show serve dashboard help with expected options", async () => {
    const output = await runCli("serve dashboard --help");
    expect(output).toContain("Launch the AKCP Control Plane Dashboard");
    expect(output).toContain("-p, --port <number>");
    expect(output).toContain("--host <host>");
    expect(output).toContain("--ir <path>");
    expect(output).toContain("--bundle <path>");
    expect(output).toContain("--demo");
    expect(output).toContain("--no-demo");
  });

  it("should be listed as a valid subcommand under akcp serve --help", async () => {
    const output = await runCli("serve --help");
    expect(output).toContain("dashboard");
    expect(output).toContain("Launch the AKCP Control Plane Dashboard");
  });
});
