import { describe, it, expect, beforeAll } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";

const execAsync = promisify(exec);
const cliPath = path.resolve(__dirname, "../../dist/index.js");
const workspaceRoot = path.resolve(__dirname, "../../../..");

describe("CLI Control Plane Commands", () => {
  beforeAll(async () => {
    // Ensure CLI is built
    if (!fs.existsSync(cliPath)) {
      throw new Error(`CLI build not found at ${cliPath}`);
    }
  });

  const runCli = async (args: string) => {
    const { stdout, stderr } = await execAsync(`node ${cliPath} ${args}`, {
      encoding: "utf-8",
      cwd: workspaceRoot,
    });
    return stdout + stderr;
  };

  it("should inspect career domain bundle and output runtime state", async () => {
    const output = await runCli(
      "control-plane inspect examples/domains/career",
    );
    expect(output).toContain("=== AKCP Control Plane Runtime State ===");
    expect(output).toContain("Bundle ID:");
    expect(output).toContain("--- Governance Policies ---");
    expect(output).toContain("--- Capabilities & Tools ---");
  });

  it("should inspect career domain bundle with --json", async () => {
    const output = await runCli(
      "control-plane inspect examples/domains/career --json",
    );
    const parsed = JSON.parse(output.trim());
    expect(parsed).toHaveProperty("bundleId");
    expect(parsed).toHaveProperty("buildId");
    expect(parsed).toHaveProperty("irVersion");
    expect(parsed).toHaveProperty("riskBreakdown");
  });

  it("should list policies for career domain bundle", async () => {
    const output = await runCli(
      "control-plane policies examples/domains/career",
    );
    expect(output).toContain("=== AKCP Registered Policy Cards");
  });

  it("should list policies for career domain bundle with --json", async () => {
    const output = await runCli(
      "control-plane policies examples/domains/career --json",
    );
    const parsed = JSON.parse(output.trim());
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("should list approvals and return formatted empty output when no approvals file exists", async () => {
    const output = await runCli("control-plane approvals --status ALL");
    expect(output).toContain("=== AKCP Human-In-The-Loop Approvals");
    expect(output).toContain(
      "No approval records found matching the criteria.",
    );
  });

  it("should list approvals with --json", async () => {
    const output = await runCli("control-plane approvals --json");
    const parsed = JSON.parse(output.trim());
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("should read audit trail from a custom audit file", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "akcp-audit-test-"));
    const auditFile = path.join(tempDir, "audit.log");

    const sampleLog = [
      JSON.stringify({
        id: "evt-1",
        timestamp: "2026-09-11T10:00:00.000Z",
        action: "capability.invoke",
        decision: "allow",
        actor: "agent-1",
        capabilityId: "career.readProfile",
        riskLevel: "low",
        evidence: { reason: "Policy evaluation passed" },
      }),
      JSON.stringify({
        id: "evt-2",
        timestamp: "2026-09-11T10:01:00.000Z",
        action: "capability.invoke",
        decision: "deny",
        actor: "agent-2",
        capabilityId: "career.deleteAccount",
        riskLevel: "critical",
        evidence: { reason: "Missing human approval" },
      }),
    ].join("\n");

    fs.writeFileSync(auditFile, sampleLog, "utf-8");

    try {
      const output = await runCli(`control-plane audit --file "${auditFile}"`);
      expect(output).toContain("=== AKCP Runtime Audit Trail");
      expect(output).toContain("ALLOW - capability.invoke");
      expect(output).toContain("DENY - capability.invoke");
      expect(output).toContain("career.readProfile");
      expect(output).toContain("career.deleteAccount");

      const jsonOutput = await runCli(
        `control-plane audit --file "${auditFile}" --json`,
      );
      const parsed = JSON.parse(jsonOutput.trim());
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe("evt-1");
      expect(parsed[1].id).toBe("evt-2");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
