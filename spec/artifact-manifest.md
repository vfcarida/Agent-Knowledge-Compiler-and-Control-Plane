# Artifact Manifest Specification

> **Status:** DRAFT — v0.1.0-draft  
> **Spec Section:** MANIFEST-1  

## 1. Introduction

The Artifact Manifest is a machine-readable file (`akcp-manifest.json`) generated alongside every compiled AKCP output. It provides a complete bill-of-materials for the compilation, enabling downstream tools to verify integrity, trace provenance, and understand the structure of the produced artifacts.

## 2. Schema

```json
{
  "manifestVersion": "1.0",
  "specVersion": "0.1.0",
  "bundleId": "<uuid>",
  "bundleName": "<string>",
  "compiledAt": "<ISO-8601>",
  "sourceHash": "<sha256-hex>",
  "artifacts": [
    {
      "target": "ir-json",
      "path": "dist/ir.json",
      "hash": "<sha256-hex>",
      "sizeBytes": 12345
    }
  ],
  "stats": {
    "nodeCount": 42,
    "edgeCount": 18,
    "totalTokenEstimate": 15000,
    "durationMs": 320
  }
}
```

### 2.1 Root Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `manifestVersion` | string | REQUIRED | Schema version of the manifest itself. |
| `specVersion` | string | REQUIRED | The AK-IR spec version used during compilation. |
| `bundleId` | string (UUID v4) | REQUIRED | Matches the `bundleId` in the AK-IR. |
| `bundleName` | string | REQUIRED | Human-readable name from `akcp.yaml`. |
| `compiledAt` | string (ISO-8601) | REQUIRED | Timestamp of the compilation run. |
| `sourceHash` | string (SHA-256 hex) | REQUIRED | Deterministic hash of all source files. |
| `artifacts` | array | REQUIRED | List of produced output files. |
| `stats` | object | RECOMMENDED | Compilation statistics. |

### 2.2 ArtifactEntry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target` | string | REQUIRED | The target ID (e.g., `ir-json`). |
| `path` | string | REQUIRED | Path relative to the output directory. |
| `hash` | string (SHA-256 hex) | REQUIRED | Hash of the produced artifact file. |
| `sizeBytes` | integer | RECOMMENDED | File size in bytes. |

## 3. Usage

Downstream tools (CI pipelines, MCP servers, audit systems) MUST use the `sourceHash` and per-artifact `hash` fields to verify the integrity of a compiled bundle before loading it into production.
