export interface ProvenanceRecord {
  conceptId: string;
  sourceFile: string;
  sourceHash: string; // SHA-256 of the raw file
  timestamp: string;
}

export interface BuildManifest {
  version: string;
  buildId: string;
  bundleId: string;
  timestamp: string;
  toolVersion: string;
  configHash: string;
  policyBundleHash?: string;
  sourceHashes: Record<string, string>;
  targets: ArtifactProvenance[];
  warnings: string[];
}

export interface ArtifactProvenance {
  targetType: string;
  outputPath: string;
  hash: string; // SHA-256 of the emitted artifact
  bytesWritten: number;
}
