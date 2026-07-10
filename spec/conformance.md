# AKCP Conformance Specification

> **Status:** DRAFT — v0.1.0-draft  
> **Spec Section:** CONFORM-1  

## 1. Introduction

This document defines the conformance levels for AKCP-compatible tools. Any tool claiming AKCP compatibility MUST declare its conformance level.

## 2. Conformance Levels

### Level 1: Reader

A **Level 1 Reader** can consume a compiled AK-IR artifact.

**Requirements:**
- MUST parse the `ir-json` target output without errors.
- MUST respect the `specVersion` field and reject IR from incompatible spec versions.

**Examples:** An MCP server that reads from a compiled `ir.json`.

---

### Level 2: Compiler

A **Level 2 Compiler** can produce a valid AK-IR artifact from OKF source documents.

**Requirements:**
- MUST satisfy all Level 1 requirements.
- MUST implement all compiler pipeline stages defined in [`akcp-build-spec.md`](akcp-build-spec.md).
- MUST produce a valid `akcp-manifest.json` alongside every compilation.
- MUST be deterministic (see BUILD-1 §3).
- MUST support at least one output target.

---

### Level 3: Control Plane

A **Level 3 Control Plane** actively governs agent access to compiled knowledge.

**Requirements:**
- MUST satisfy all Level 2 requirements.
- MUST enforce Policy Cards at the MCP gateway boundary (see POLICY-1 §5).
- MUST maintain an immutable audit log of all access decisions.
- MUST support `requireApprovalFor` (HITL) for at minimum one tool category.

---

## 3. Conformance Claims

Implementations MUST declare their conformance level in their documentation and SHOULD display a conformance badge. The AKCP conformance test suite (in `packages/conformance`) provides automated verification.

## 4. References to Spec Sections

| Requirement | Spec Reference |
|-------------|----------------|
| AK-IR schema | [IR-1](agent-knowledge-ir.md) |
| Compiler pipeline | [BUILD-1](akcp-build-spec.md) |
| Policy Cards | [POLICY-1](policy-cards.md) |
| Artifact Manifest | [MANIFEST-1](artifact-manifest.md) |
