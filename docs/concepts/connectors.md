# Source Adapters Architecture

Source Adapters are the ingress boundary for AKCP. They transform varied unstructured or semi-structured data sources into normalized OKF/AK-IR, enabling consistent compilation, provenance tracking, and policy enforcement downstream.

## The `SourceAdapter` Interface

```ts
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

export type NormalizedKnowledgeDocument = {
  type: string;
  frontmatter: Record<string, any>;
  markdown: string;
  provenance: ProvenanceRecord;
};

export interface SourceAdapter {
  name: string;
  version: string;

  detect(inputPath: string): Promise<DetectionResult>;
  scan(inputPath: string): Promise<SourceDocument[]>;
  normalize(document: SourceDocument): Promise<NormalizedKnowledgeDocument>;
}
```

## `ImportReport`

Every import operation must yield an `ImportReport`:

```ts
export type Diagnostic = {
  level: "error" | "warning" | "info";
  message: string;
  uri?: string;
};

export type ImportReport = {
  ok: boolean;
  sourceType: "openwiki" | "okf" | "markdown" | "repo-docs";
  inputPath: string;
  outputPath: string;
  documentsFound: number;
  documentsImported: number;
  documentsSkipped: number;
  diagnostics: Diagnostic[];
  provenance: ProvenanceRecord[];
};
```

## Provenance Tracking

`ProvenanceRecord` ensures a cryptographic trail from the original source file to the normalized IR representation.

```ts
export type ProvenanceRecord = {
  sourceUri: string;
  sourceType: string;
  sourceHash: string;
  importedAt: string;
  adapterName: string;
  adapterVersion: string;
  targetDocumentId: string;
};
```
