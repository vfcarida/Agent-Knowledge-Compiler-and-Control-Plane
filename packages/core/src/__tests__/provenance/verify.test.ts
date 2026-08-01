import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { verifyManifest } from "../../provenance/verify.js";
import { ProvenanceManifestBuilder } from "../../provenance/build-manifest.js";
import fs from "node:fs/promises";
import path from "node:path";
import { hashFile } from "../../provenance/hash.js";

describe("Provenance Verification", () => {
  const testDir = path.resolve(process.cwd(), "dist/test-provenance");

  const manifestPath = path.join(testDir, "akcp-manifest.json");
  const mockArtifactPath = path.join(testDir, "mock-target.txt");

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should verify a valid manifest successfully", async () => {
    // 1. Create a dummy artifact
    await fs.writeFile(mockArtifactPath, "Hello Provenance!", "utf-8");
    const artifactHash = await hashFile(mockArtifactPath);

    // 2. Build the manifest
    const builder = new ProvenanceManifestBuilder();
    builder.addOutput({
      targetType: "test-target",
      outputPath: "dist/test-provenance/mock-target.txt",
      hash: artifactHash,
      bytesWritten: 17,
    });

    const irMock = {
      buildId: "bld_123",
      bundleId: "test_bundle",
      timestamp: new Date().toISOString(),
      concepts: [],
    } as any;

    await builder.writeManifest(
      irMock,
      "dist/test-provenance/akcp-manifest.json",
      "hash123",
      "0.1.0",
    );

    // 3. Verify
    const report = await verifyManifest(
      "dist/test-provenance/akcp-manifest.json",
    );
    expect(report.isValid).toBe(true);
    expect(report.tamperedFiles).toHaveLength(0);
    expect(report.missingFiles).toHaveLength(0);
  });

  it("should fail verification if a file is tampered", async () => {
    // 1. Create a dummy artifact
    await fs.writeFile(mockArtifactPath, "Hello Provenance!", "utf-8");
    const artifactHash = await hashFile(mockArtifactPath);

    // 2. Build the manifest
    const builder = new ProvenanceManifestBuilder();
    builder.addOutput({
      targetType: "test-target",
      outputPath: "dist/test-provenance/mock-target.txt",
      hash: artifactHash,
      bytesWritten: 17,
    });

    const irMock = {
      buildId: "bld_123",
      bundleId: "test_bundle",
      timestamp: new Date().toISOString(),
      concepts: [],
    } as any;

    await builder.writeManifest(
      irMock,
      "dist/test-provenance/akcp-manifest.json",
      "hash123",
      "0.1.0",
    );

    // 3. Tamper with the artifact
    await fs.writeFile(mockArtifactPath, "Hello TAMPERED!", "utf-8");

    // 4. Verify
    const report = await verifyManifest(
      "dist/test-provenance/akcp-manifest.json",
    );
    expect(report.isValid).toBe(false);
    expect(report.tamperedFiles).toContain(
      "dist/test-provenance/mock-target.txt",
    );
  });

  it("should fail verification if a file is missing", async () => {
    // 1. Create a dummy artifact
    await fs.writeFile(mockArtifactPath, "Hello Provenance!", "utf-8");
    const artifactHash = await hashFile(mockArtifactPath);

    // 2. Build the manifest
    const builder = new ProvenanceManifestBuilder();
    builder.addOutput({
      targetType: "test-target",
      outputPath: "dist/test-provenance/mock-target.txt",
      hash: artifactHash,
      bytesWritten: 17,
    });

    const irMock = {
      buildId: "bld_123",
      bundleId: "test_bundle",
      timestamp: new Date().toISOString(),
      concepts: [],
    } as any;

    await builder.writeManifest(
      irMock,
      "dist/test-provenance/akcp-manifest.json",
      "hash123",
      "0.1.0",
    );

    // 3. Delete the artifact
    await fs.rm(mockArtifactPath);

    // 4. Verify
    const report = await verifyManifest(
      "dist/test-provenance/akcp-manifest.json",
    );
    expect(report.isValid).toBe(false);
    expect(report.missingFiles).toContain(
      "dist/test-provenance/mock-target.txt",
    );
  });

  it("should not crash (EISDIR) when a target's single output is a directory, e.g. openwiki", async () => {
    // A target like "openwiki" writes many files under one directory but is
    // recorded with a single output path + a hash — hashFile() used to call
    // fs.readFile() on that path directly and throw EISDIR uncaught.
    const dirTargetPath = path.join(testDir, "openwiki-dir");
    await fs.mkdir(dirTargetPath, { recursive: true });
    await fs.writeFile(path.join(dirTargetPath, "page.md"), "content");

    const builder = new ProvenanceManifestBuilder();
    builder.addOutput({
      targetType: "openwiki",
      outputPath: "dist/test-provenance/openwiki-dir",
      hash: "deterministic_hash",
      bytesWritten: 0,
    });

    const irMock = {
      buildId: "bld_123",
      bundleId: "test_bundle",
      timestamp: new Date().toISOString(),
      concepts: [],
    } as any;

    await builder.writeManifest(
      irMock,
      "dist/test-provenance/akcp-manifest.json",
      "hash123",
      "0.1.0",
    );

    const report = await verifyManifest(
      "dist/test-provenance/akcp-manifest.json",
    );
    // Directories fall back to an existence check (real hash verification of a
    // directory tree is a separate feature) — the key assertion is that this
    // doesn't throw and doesn't report the directory as missing/tampered.
    expect(report.isValid).toBe(true);
    expect(report.missingFiles).toHaveLength(0);
  });
});
