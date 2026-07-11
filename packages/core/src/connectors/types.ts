export interface ConnectorConfig {
  type: string;
  path?: string;
  url?: string;
  exclude?: string[];
  [key: string]: any;
}

export type DetectionResult = {
  isSupported: boolean;
  confidence: number;
  reason?: string;
};

export type SourceDocument = {
  sourceUri: string;
  rawContent: string;
  hash: string;
};

export type SourceProvenanceRecord = {
  sourceUri: string;
  sourceType: string;
  sourceHash: string;
  importedAt: string;
  adapterName: string;
  adapterVersion: string;
  targetDocumentId: string;
};

export type NormalizedKnowledgeDocument = {
  type: string;
  frontmatter: Record<string, any>;
  markdown: string;
  provenance: SourceProvenanceRecord;
};

export interface SourceAdapter {
  name: string;
  version: string;

  detect(inputPath: string): Promise<DetectionResult>;
  scan(inputPath: string): Promise<SourceDocument[]>;
  normalize(document: SourceDocument): Promise<NormalizedKnowledgeDocument>;
}

export type Diagnostic = {
  level: "error" | "warning" | "info";
  message: string;
  uri?: string;
};

export type SourceImportReport = {
  ok: boolean;
  sourceType: "openwiki" | "okf" | "markdown" | "repo-docs";
  inputPath: string;
  outputPath: string;
  documentsFound: number;
  documentsImported: number;
  documentsSkipped: number;
  diagnostics: Diagnostic[];
  provenance: SourceProvenanceRecord[];
};

// Legacy interface mapping for backward compatibility if needed, or we just drop it.
export interface RawKnowledgeItem {
  sourceUri: string;
  contentHash: string;
  metadata: Record<string, any>;
  rawContent: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KnowledgeSourceConnector {
  connectorType: string;
  ingest(config: ConnectorConfig): Promise<RawKnowledgeItem[]>;
}
