export interface ConnectorConfig {
  type: string;
  path?: string;
  url?: string;
  exclude?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  frontmatter: Record<string, any>;
  markdown: string;
  provenance: SourceProvenanceRecord;
};

export interface SourceAdapter {
  name: string;
  version: string;

  // eslint-disable-next-line no-unused-vars
  detect(inputPath: string): Promise<DetectionResult>;
  // eslint-disable-next-line no-unused-vars
  scan(inputPath: string): Promise<SourceDocument[]>;
  // eslint-disable-next-line no-unused-vars
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
  rawContent: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KnowledgeSourceConnector {
  connectorType: string;
  // eslint-disable-next-line no-unused-vars
  ingest(config: ConnectorConfig): Promise<RawKnowledgeItem[]>;
}
