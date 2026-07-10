export interface ConnectorConfig {
  type: string;
  path?: string;
  url?: string;
  exclude?: string[];
  [key: string]: any;
}

export interface RawKnowledgeItem {
  sourceUri: string;
  contentHash: string;
  metadata: Record<string, any>;
  rawContent: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KnowledgeSourceConnector {
  /** Uniquely identifies the capability of this connector */
  connectorType: string;

  /** Fetch raw items from the configured source */
  ingest(config: ConnectorConfig): Promise<RawKnowledgeItem[]>;
}
