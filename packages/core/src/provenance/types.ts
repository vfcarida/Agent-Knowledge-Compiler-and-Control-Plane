export interface ProvenanceRecord {
  conceptId: string;
  sourceFile: string;
  sourceHash: string; // SHA-256 of the raw file
  timestamp: string;
}

export interface ConformanceInfo {
  level: string;

  checks: any[];
}

export interface BuildManifest {
  schemaVersion: string;
  buildId: string;
  createdAt: string;
  source: {
    root: string;
    config: string;
    hash: string;
  };
  compiler: {
    name: string;
    version: string;
  };
  targets: ArtifactProvenance[];

  diagnostics: any[];
  conformance: ConformanceInfo;
}

export interface ArtifactProvenance {
  name: string;
  status: string;
  outputs: string[];
  hash?: string;
  sizeBytes?: number;
}
