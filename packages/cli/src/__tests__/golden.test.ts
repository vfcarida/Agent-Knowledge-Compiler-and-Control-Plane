import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const cliPath = path.resolve(__dirname, "../../dist/index.js");
const workspaceRoot = path.resolve(__dirname, "../../../..");

describe("Golden Compiler Tests", () => {
  // Ensure the CLI is built before running these tests
  if (!fs.existsSync(cliPath)) {
    console.warn("[WARN] CLI binary not found. Skipping golden tests.");
    return;
  }

  const runCli = (args: string, dir: string) => {
    return execSync("node " + cliPath + " " + args, { encoding: "utf-8", stdio: "pipe", cwd: dir });
  };

  it("compiles Career domain bundle deterministically", async () => {
    const dir = path.resolve(workspaceRoot, "examples/domains/career");
    const outManifest = path.resolve(dir, "dist/akcp-manifest.json");

    // Clean previous
    if (fs.existsSync(outManifest)) {
      fs.rmSync(outManifest);
    }

    // Run compile
    const output = runCli("compile --config akcp.yaml", dir);
    expect(output).toContain("Compilation complete");

    // Check manifest exists
    expect(fs.existsSync(outManifest)).toBe(true);

    // Snapshot manifest (omit timestamp/buildId/hashes for determinism)
    const manifest = JSON.parse(fs.readFileSync(outManifest, "utf-8"));
    manifest.timestamp = "2026-01-01T00:00:00.000Z";
    manifest.createdAt = "2026-01-01T00:00:00.000Z";
    manifest.buildId = "deterministic_build_id";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manifest.targets.forEach((t: any) => {
      t.hash = "deterministic_hash";
    });

    await expect(manifest).toMatchFileSnapshot("__snapshots__/career-manifest.json");
  });

  it("compiles IT Operations domain bundle deterministically", async () => {
    const dir = path.resolve(workspaceRoot, "examples/domains/it-operations");
    const outManifest = path.resolve(dir, "dist/akcp-manifest.json");

    // Clean previous
    if (fs.existsSync(outManifest)) {
      fs.rmSync(outManifest);
    }

    // Run compile
    const output = runCli("compile --config akcp.yaml", dir);
    expect(output).toContain("Compilation complete");

    // Check manifest exists
    expect(fs.existsSync(outManifest)).toBe(true);

    // Snapshot manifest (omit timestamp/buildId/hashes for determinism)
    const manifest = JSON.parse(fs.readFileSync(outManifest, "utf-8"));
    manifest.timestamp = "2026-01-01T00:00:00.000Z";
    manifest.createdAt = "2026-01-01T00:00:00.000Z";
    manifest.buildId = "deterministic_build_id";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manifest.targets.forEach((t: any) => {
      t.hash = "deterministic_hash";
    });

    await expect(manifest).toMatchFileSnapshot("__snapshots__/it-operations-manifest.json");
  });
});
