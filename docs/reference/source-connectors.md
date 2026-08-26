# Source Connectors

The **Agent Knowledge Compiler and Control Plane (AKCP)** supports ingesting knowledge from different data sources and formats using **Source Connectors**.

This plugin-based ingestion architecture allows agents to discover and reason across knowledge spread across OpenWiki exports, Markdown repositories, and OpenAPI definitions, without requiring manual pre-conversion into OKF frontmatter format.

## Ingestion Configuration (`akcp.yaml`)

In your `akcp.yaml` configuration file, list one or more source paths and specify the `type` property to select the corresponding connector:

```yaml
compile:
  sources:
    - type: okf-directory
      path: ./sources
    - type: markdown-directory
      path: ./docs/product
    - type: openwiki
      path: ./openwiki-export
    - type: openapi
      path: ./api-spec.json
  targets:
    - type: context-pack
      out: ./dist/agent-knowledge-ir.json
```

## How Ingestion Works

1. **Ingest**: Each connector scans its configured source directory or file (`path`) and extracts raw items (`RawKnowledgeItem`). It computes cryptographic provenance hashes and captures raw metadata.
2. **Normalize**: The normalization stage (`packages/core/src/normalizers/normalize.ts`) processes all ingested items regardless of origin, parses concepts, resolves links, and compiles them into typed `IRConcept` objects for agent consumption.

## Creating New Connectors

To ingest knowledge from custom or enterprise repositories (e.g. Jira, Confluence, Notion), implement the `KnowledgeSourceConnector` interface:

```typescript
export interface KnowledgeSourceConnector {
  connectorType: string;
  ingest(config: ConnectorConfig): Promise<RawKnowledgeItem[]>;
}
```

### Connector Best Practices

- **Build-Time Execution**: Connectors execute during compilation/build time, not during runtime tool execution.
- **Minimal Dependencies**: Keep external dependencies lightweight to avoid bloating build pipelines.
- **Security & Secret Redaction**: Do not ingest hardcoded credentials or unredacted keys. Use privacy redaction stages to sanitize sensitive strings before IR emission.
