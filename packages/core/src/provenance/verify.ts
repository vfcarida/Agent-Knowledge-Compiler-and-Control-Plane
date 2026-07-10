import fs from 'node:fs/promises';
import path from 'node:path';
import { hashFile } from './hash.js';
import type { BuildManifest } from './types.js';

export interface VerifyReport {
  isValid: boolean;
  tamperedFiles: string[];
  missingFiles: string[];
  manifestTimestamp: string;
}

export async function verifyManifest(manifestPath: string): Promise<VerifyReport> {
  const fullManifestPath = path.resolve(process.cwd(), manifestPath);
  
  try {
    await fs.access(fullManifestPath);
  } catch {
    throw new Error(`Manifest not found at ${fullManifestPath}`);
  }

  const raw = await fs.readFile(fullManifestPath, 'utf-8');
  let manifest: BuildManifest;
  try {
    manifest = JSON.parse(raw) as BuildManifest;
  } catch {
    throw new Error(`Failed to parse manifest JSON at ${fullManifestPath}`);
  }

  const report: VerifyReport = {
    isValid: true,
    tamperedFiles: [],
    missingFiles: [],
    manifestTimestamp: manifest.timestamp
  };

  const basePath = process.cwd(); // Assume paths in manifest are relative to CWD

  for (const target of manifest.targets) {
    const fullTargetPath = path.resolve(basePath, target.outputPath);
    try {
      const currentHash = await hashFile(fullTargetPath);
      if (currentHash !== target.hash) {
        report.isValid = false;
        report.tamperedFiles.push(target.outputPath);
      }
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        report.isValid = false;
        report.missingFiles.push(target.outputPath);
      } else {
         throw err;
      }
    }
  }

  return report;
}
