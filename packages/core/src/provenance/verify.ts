import fs from "node:fs/promises";
import path from "node:path";
import { hashFile } from "./hash.js";
import type { BuildManifest } from "./types.js";

export interface VerifyReport {
  isValid: boolean;
  tamperedFiles: string[];
  missingFiles: string[];
  manifestTimestamp: string;
}

export async function verifyManifest(
  manifestPath: string,
): Promise<VerifyReport> {
  const fullManifestPath = path.resolve(process.cwd(), manifestPath);

  try {
    await fs.access(fullManifestPath);
  } catch {
    throw new Error(`Manifest not found at ${fullManifestPath}`);
  }

  const raw = await fs.readFile(fullManifestPath, "utf-8");
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
    manifestTimestamp: manifest.createdAt,
  };

  const basePath = process.cwd(); // Assume paths in manifest are relative to CWD

  for (const target of manifest.targets) {
    // Some targets (e.g. openwiki) record a single output that is a directory,
    // not a file — hashFile() does fs.readFile() on it and throws EISDIR, which
    // used to crash the whole command since only ENOENT was handled. Check the
    // path type first so directory targets fall through to the existence-only
    // verification below instead.
    const singleOutputPath =
      target.outputs.length === 1 ? (target.outputs[0] as string) : undefined;
    let singleOutputIsFile = false;
    if (singleOutputPath) {
      try {
        const stat = await fs.stat(path.resolve(basePath, singleOutputPath));
        singleOutputIsFile = stat.isFile();
      } catch {
        singleOutputIsFile = false;
      }
    }

    // Only verify hash if we have a single primary output matching the recorded hash
    if (
      singleOutputPath &&
      singleOutputIsFile &&
      typeof target.hash === "string"
    ) {
      const outputPath = singleOutputPath;
      const fullTargetPath = path.resolve(basePath, outputPath);
      try {
        const currentHash = await hashFile(fullTargetPath);
        if (currentHash !== target.hash) {
          report.isValid = false;
          report.tamperedFiles.push(outputPath);
        }
      } catch (err: any) {
        if (err.code === "ENOENT") {
          report.isValid = false;
          report.missingFiles.push(outputPath);
        } else {
          throw err;
        }
      }
    } else {
      // Fallback: just check existence if no single hash is provided
      for (const outputPath of target.outputs) {
        const fullTargetPath = path.resolve(basePath, outputPath);
        try {
          await fs.access(fullTargetPath);
        } catch (err: any) {
          if (err.code === "ENOENT") {
            report.isValid = false;
            report.missingFiles.push(outputPath);
          } else {
            throw err;
          }
        }
      }
    }
  }

  return report;
}
