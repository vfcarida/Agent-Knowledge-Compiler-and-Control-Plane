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
    return execSync("node " + cliPath + " " + args, {
      encoding: "utf-8",
      stdio: "pipe",
      cwd: dir,
    });
  };

  // The manifest embeds machine-specific values (absolute output paths, a
  // config hash computed over resolved paths, byte sizes that vary with path
  // length inside the outputs). The original snapshots had the author's
  // Windows paths baked in, so the test failed on every other machine —
  // including CI. Scrub everything machine-dependent so the snapshot captures
  // the *shape and relative layout* of the build, which is the part that
  // should be deterministic.
  const normalizePathsDeep = (value: unknown): unknown => {
    if (typeof value === "string") {
      const posix = value.replace(/\\/g, "/");
      const idx = posix.indexOf("examples/domains");
      if (idx > 0) return "<WORKSPACE>/" + posix.slice(idx);
      return posix;
    }
    if (Array.isArray(value)) return value.map(normalizePathsDeep);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, normalizePathsDeep(v)]),
      );
    }
    return value;
  };

  const scrubManifest = (manifest: any): unknown => {
    manifest.timestamp = "2026-01-01T00:00:00.000Z";
    manifest.createdAt = "2026-01-01T00:00:00.000Z";
    manifest.buildId = "deterministic_build_id";
    if (manifest.source) manifest.source.hash = "deterministic_config_hash";

    manifest.targets.forEach((t: any) => {
      t.hash = "deterministic_hash";
      // Output sizes vary across machines because compiled artifacts embed
      // absolute paths whose length differs per machine.
      t.sizeBytes = 0;
    });
    return normalizePathsDeep(manifest);
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

    // Snapshot manifest (scrubbed of machine-dependent values for portability)
    const manifest = scrubManifest(
      JSON.parse(fs.readFileSync(outManifest, "utf-8")),
    );

    await expect(manifest).toMatchFileSnapshot(
      "__snapshots__/career-manifest.json",
    );
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

    // Snapshot manifest (scrubbed of machine-dependent values for portability)
    const manifest = scrubManifest(
      JSON.parse(fs.readFileSync(outManifest, "utf-8")),
    );

    await expect(manifest).toMatchFileSnapshot(
      "__snapshots__/it-operations-manifest.json",
    );
  });
});
