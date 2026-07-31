export type CompilerError =
  ValidationError | PiiError | ConnectorError | SchemaError;

export interface ValidationError {
  type: "validation";
  message: string;
  source?: string;
  details?: unknown;
}

export interface PiiError {
  type: "pii";
  message: string;
  source: string;
  piiType?: string;
}

export interface ConnectorError {
  type: "connector";
  message: string;
  connectorType: string;
  source?: string;
}

export interface SchemaError {
  type: "schema";
  message: string;
  path?: string;
  details?: unknown;
}

export interface CompilerWarning {
  type:
    | "stale_document"
    | "unknown_source_type"
    | "missing_link_target"
    | "pii_redacted";
  message: string;
  source?: string;
}
