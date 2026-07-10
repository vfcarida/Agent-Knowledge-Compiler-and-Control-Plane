# AKCP Build Specification

> **Status:** DRAFT — v0.1.0-draft  
> **Spec Section:** BUILD-1  

## 1. Introduction

This document specifies the normative behavior of an AKCP-compliant compiler. The compiler transforms source OKF documents into a validated AK-IR instance.

## 2. Pipeline Stages

An AKCP-compliant compiler MUST implement the following pipeline stages in order:

```
[Source] → [Parse] → [Normalize] → [Validate] → [Compile] → [Emit]
```

### 2.1 Parse

The compiler MUST:
1. Recursively discover all `.md` files within the bundle root directory.
2. Parse the YAML frontmatter from each file, treating a missing frontmatter block as a parse warning (not a fatal error).
3. Parse the Markdown body.

The compiler MUST NOT silently drop files. Unparseable files MUST be logged with a reason.

### 2.2 Normalize

The compiler MUST:
1. Apply all schema migrations for OKF versions older than the current supported version.
2. Resolve `$ref` references and cross-document links.
3. Compute a stable `id` for each node using the following algorithm: `sha256(bundle_root_relative_path)`.

### 2.3 Validate

The compiler MUST validate each parsed document against the OKF schema. Validation failures MUST produce a structured error output including the file path, line number, and violation description.

The compiler SHOULD support a `--strict` flag that causes validation failures to abort compilation.

### 2.4 Compile

The compiler MUST:
1. Construct all `NodeObject` instances.
2. Resolve cross-document relationships and construct `EdgeObject` instances.
3. Compute `tokenEstimate` for each node using a deterministic estimator.
4. Compute the `sourceHash` of all source files.

### 2.5 Emit

The compiler MUST support at minimum one of the following output targets:

| Target ID | Description |
|-----------|-------------|
| `ir-json` | Raw AK-IR as a JSON file. |
| `openwiki-docs` | Markdown files formatted for OpenWiki/agent consumption. |
| `eval-dataset` | JSONL evaluation dataset. |
| `policy-bundle` | Compiled `.policy.json` file. |

## 3. Determinism

A compiler is REQUIRED to be deterministic: given identical source files, it MUST produce byte-for-byte identical AK-IR output (excluding `compiledAt`).

## 4. Configuration

The compiler MUST accept a configuration file (`akcp.yaml`) at the bundle root. The presence of this file is REQUIRED for a directory to be treated as an AKCP bundle.
