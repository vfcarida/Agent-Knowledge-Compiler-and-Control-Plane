# Agent Knowledge IR Specification

> **Status:** DRAFT — v0.1.0-draft  
> **Spec Section:** IR-1  

## 1. Introduction

The Agent Knowledge Intermediate Representation (AK-IR) is a language-agnostic, serializable data structure produced by an AKCP-compliant compiler from source OKF documents. It is the canonical artifact consumed by all downstream targets (OpenWiki, MCP, Eval datasets, etc.).

## 2. Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHOULD", "RECOMMENDED", and "MAY" in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## 3. Data Model

An AK-IR instance is a JSON object conforming to the following schema:

### 3.1 Root Object

```json
{
  "specVersion": "0.1.0",
  "bundleId": "<uuid>",
  "compiledAt": "<ISO-8601 timestamp>",
  "sourceHash": "<sha256-hex>",
  "nodes": [ "<NodeObject>", "..." ],
  "edges": [ "<EdgeObject>", "..." ],
  "provenance": "<ProvenanceObject>"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `specVersion` | string | REQUIRED | The AK-IR spec version that produced this IR. |
| `bundleId` | string (UUID v4) | REQUIRED | A unique identifier for this compiled bundle. |
| `compiledAt` | string (ISO-8601) | REQUIRED | The timestamp of compilation. |
| `sourceHash` | string (SHA-256 hex) | REQUIRED | The deterministic hash of all source OKF documents. |
| `nodes` | array | REQUIRED | The set of knowledge nodes. |
| `edges` | array | REQUIRED | Directed relationships between nodes. |
| `provenance` | object | REQUIRED | Provenance metadata for audit purposes. |

### 3.2 NodeObject

```json
{
  "id": "<string>",
  "type": "<NodeType>",
  "title": "<string>",
  "content": "<string>",
  "metadata": {},
  "tokenEstimate": "<integer>"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | REQUIRED | A globally unique, stable identifier for this node. |
| `type` | NodeType | REQUIRED | The semantic type of the node (see §3.4). |
| `title` | string | REQUIRED | The human-readable title of the node. |
| `content` | string | REQUIRED | The processed Markdown content. |
| `metadata` | object | REQUIRED | Arbitrary key-value metadata from OKF frontmatter. |
| `tokenEstimate` | integer | RECOMMENDED | A pre-computed token count estimate for budget planning. |

### 3.3 EdgeObject

```json
{
  "from": "<node-id>",
  "to": "<node-id>",
  "relation": "<RelationType>"
}
```

### 3.4 NodeType Enum

Implementations MUST support the following node types:

- `skill`
- `experience`
- `education`
- `document`
- `concept`
- `playbook`
- `api-endpoint`
- `policy`

Implementations MAY define additional types using a reverse-DNS namespace (e.g., `com.example.custom-type`).

### 3.5 ProvenanceObject

```json
{
  "author": "<string>",
  "compiledBy": "<string>",
  "sourceUri": "<string>"
}
```

## 4. Compatibility

An AK-IR with `specVersion: "0.1.x"` MUST be processable by any AKCP-compliant tool claiming support for `0.1`. Patch versions MUST NOT introduce breaking schema changes.
