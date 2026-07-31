import { describe, it, expect } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { ProvenanceManifestBuilder } from "../../provenance/build-manifest.js";
import type { AgentKnowledgeIR } from "../../ir/types.js";
import type { TargetOutput } from "../../targets/types.js";

function sampleIr(overrides: Partial<AgentKnowledgeIR> = {}): AgentKnowledgeIR {
  return {
    irVersion: "1.0.0",
    okfVersion: "0.1.0",
    bundleId: "bundle-1",
    buildId: "bld_abc123",
    timestamp: "2026-07-08T00:00:00Z",
    concepts: [],
    ...overrides,
  };
}

describe("ProvenanceManifestBuilder", () => {
  it("writes a manifest whose shape matches addOutput/addWarning/setConformance calls", async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "akcp-build-manifest-"),
    );
    try {
      const builder = new ProvenanceManifestBuilder();

      const output1: TargetOutput = {
        targetType: "ir-json",
        outputPath: "dist/ir.json",
        hash: "hash1",
        bytesWritten: 123,
      };
      const output2: TargetOutput = {
        targetType: "mcp-profile",
        outputPath: "dist/profile.json",
        hash: "hash2",
        bytesWritten: 456,
      };

      builder.addOutput(output1);
      builder.addOutput(output2);
      builder.addWarning("some warning message");
      builder.setConformance({
        level: "okf-v0.1",
        checks: [{ name: "schema", passed: true }],
      });

      const manifestPath = path.join(tmpDir, "manifest.json");
      const ir = sampleIr();

      await builder.writeManifest(
        ir,
        manifestPath,
        "config-hash-xyz",
        "0.1.0",
        "/bundle/root",
      );

      const written = JSON.parse(await fs.readFile(manifestPath, "utf-8"));

      expect(written.schemaVersion).toBe("akcp.artifact-manifest/v1");
      expect(written.buildId).toBe(ir.buildId);
      expect(written.createdAt).toBe(ir.timestamp);
      expect(written.source).toEqual({
        root: "/bundle/root",
        config: "akcp.yaml",
        hash: "config-hash-xyz",
      });
      expect(written.compiler).toEqual({ name: "akcp", version: "0.1.0" });
      expect(written.targets).toEqual([
        {
          name: "ir-json",
          status: "success",
          outputs: ["dist/ir.json"],
          hash: "hash1",
          sizeBytes: 123,
        },
        {
          name: "mcp-profile",
          status: "success",
          outputs: ["dist/profile.json"],
          hash: "hash2",
          sizeBytes: 456,
        },
      ]);
      expect(written.diagnostics).toEqual(["some warning message"]);
      expect(written.conformance).toEqual({
        level: "okf-v0.1",
        checks: [{ name: "schema", passed: true }],
      });
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("defaults bundleRoot to '.' when not provided", async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "akcp-build-manifest-"),
    );
    try {
      const builder = new ProvenanceManifestBuilder();
      const manifestPath = path.join(tmpDir, "manifest.json");

      await builder.writeManifest(
        sampleIr(),
        manifestPath,
        "cfg-hash",
        "0.1.0",
      );

      const written = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
      expect(written.source.root).toBe(".");
      // No addOutput/addWarning/setConformance calls: defaults should hold.
      expect(written.targets).toEqual([]);
      expect(written.diagnostics).toEqual([]);
      expect(written.conformance).toEqual({ level: "none", checks: [] });
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("falls back to the IR's sourceHashes['akcp.yaml'] when configHash is empty", async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "akcp-build-manifest-"),
    );
    try {
      const builder = new ProvenanceManifestBuilder();
      const manifestPath = path.join(tmpDir, "manifest.json");
      const ir = sampleIr({ sourceHashes: { "akcp.yaml": "hash-from-ir" } });

      await builder.writeManifest(ir, manifestPath, "", "0.1.0");

      const written = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
      expect(written.source.hash).toBe("hash-from-ir");
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("falls back to 'unknown' when configHash is empty and there is no sourceHashes entry", async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "akcp-build-manifest-"),
    );
    try {
      const builder = new ProvenanceManifestBuilder();
      const manifestPath = path.join(tmpDir, "manifest.json");

      await builder.writeManifest(sampleIr(), manifestPath, "", "0.1.0");

      const written = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
      expect(written.source.hash).toBe("unknown");
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("creates the destination directory if it does not already exist", async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "akcp-build-manifest-"),
    );
    try {
      const builder = new ProvenanceManifestBuilder();
      const nestedPath = path.join(tmpDir, "nested", "deep", "manifest.json");

      await builder.writeManifest(sampleIr(), nestedPath, "cfg-hash", "0.1.0");

      const exists = await fs
        .access(nestedPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
