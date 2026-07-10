import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { verifyManifest } from '../../provenance/verify.js';
import { ProvenanceManifestBuilder } from '../../provenance/build-manifest.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { hashFile } from '../../provenance/hash.js';

describe('Provenance Verification', () => {
  const testDir = path.resolve(process.cwd(), 'dist/test-provenance');
  const manifestPath = path.join(testDir, 'akcp-manifest.json');
  const mockArtifactPath = path.join(testDir, 'mock-target.txt');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should verify a valid manifest successfully', async () => {
    // 1. Create a dummy artifact
    await fs.writeFile(mockArtifactPath, 'Hello Provenance!', 'utf-8');
    const artifactHash = await hashFile(mockArtifactPath);

    // 2. Build the manifest
    const builder = new ProvenanceManifestBuilder();
    builder.addOutput({
      targetType: 'test-target',
      outputPath: 'dist/test-provenance/mock-target.txt',
      hash: artifactHash,
      bytesWritten: 17
    });

    const irMock = {
      buildId: 'bld_123',
      bundleId: 'test_bundle',
      timestamp: new Date().toISOString(),
      concepts: []
    } as any;

    await builder.writeManifest(irMock, 'dist/test-provenance/akcp-manifest.json', 'hash123', '0.1.0');

    // 3. Verify
    const report = await verifyManifest('dist/test-provenance/akcp-manifest.json');
    expect(report.isValid).toBe(true);
    expect(report.tamperedFiles).toHaveLength(0);
    expect(report.missingFiles).toHaveLength(0);
  });

  it('should fail verification if a file is tampered', async () => {
    // 1. Create a dummy artifact
    await fs.writeFile(mockArtifactPath, 'Hello Provenance!', 'utf-8');
    const artifactHash = await hashFile(mockArtifactPath);

    // 2. Build the manifest
    const builder = new ProvenanceManifestBuilder();
    builder.addOutput({
      targetType: 'test-target',
      outputPath: 'dist/test-provenance/mock-target.txt',
      hash: artifactHash,
      bytesWritten: 17
    });

    const irMock = {
      buildId: 'bld_123',
      bundleId: 'test_bundle',
      timestamp: new Date().toISOString(),
      concepts: []
    } as any;

    await builder.writeManifest(irMock, 'dist/test-provenance/akcp-manifest.json', 'hash123', '0.1.0');

    // 3. Tamper with the artifact
    await fs.writeFile(mockArtifactPath, 'Hello TAMPERED!', 'utf-8');

    // 4. Verify
    const report = await verifyManifest('dist/test-provenance/akcp-manifest.json');
    expect(report.isValid).toBe(false);
    expect(report.tamperedFiles).toContain('dist/test-provenance/mock-target.txt');
  });

  it('should fail verification if a file is missing', async () => {
    // 1. Create a dummy artifact
    await fs.writeFile(mockArtifactPath, 'Hello Provenance!', 'utf-8');
    const artifactHash = await hashFile(mockArtifactPath);

    // 2. Build the manifest
    const builder = new ProvenanceManifestBuilder();
    builder.addOutput({
      targetType: 'test-target',
      outputPath: 'dist/test-provenance/mock-target.txt',
      hash: artifactHash,
      bytesWritten: 17
    });

    const irMock = {
      buildId: 'bld_123',
      bundleId: 'test_bundle',
      timestamp: new Date().toISOString(),
      concepts: []
    } as any;

    await builder.writeManifest(irMock, 'dist/test-provenance/akcp-manifest.json', 'hash123', '0.1.0');

    // 3. Delete the artifact
    await fs.rm(mockArtifactPath);

    // 4. Verify
    const report = await verifyManifest('dist/test-provenance/akcp-manifest.json');
    expect(report.isValid).toBe(false);
    expect(report.missingFiles).toContain('dist/test-provenance/mock-target.txt');
  });
});
