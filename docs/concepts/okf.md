# Open Knowledge Format (OKF)

The **Open Knowledge Format (OKF)** is Google Cloud's real, open specification for structuring organizational knowledge as Markdown files with YAML frontmatter, so it's readable by both humans and AI agents without heavy SDK dependencies.

> See the [OKF v0.2 Specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) for the authoritative protocol definition. This page describes how AKCP relates to it — it is not a substitute for reading the spec.

## Two things share this name — read this before the rest of the docs

AKCP predates the "AKCP-profile-compatible" naming below being reconciled with Google's spec, and the two are close cousins, not identical:

1. **Google's real OKF v0.2** requires only a `type` frontmatter field. Everything else — `title`, `description`, `resource`, `tags`, plus optional provenance (`sources`, `usage_window`), trust (`generated`, `verified`), lifecycle (`status`, `stale_after`), and computation (`runtime`, `parameters`, `computation`, `executor`, `attester`) families — is optional. A bundle root may declare `okf_version: "0.2"` in its `index.md`; that file and `log.md` are reserved structural filenames, not concepts.
2. **AKCP's own bundle schema** (`packages/core/src/domain/okf.ts`'s `OKFFrontmatterSchema`) is a superset: the same `type`/`title`/`description`/`resource`/`tags` fields, plus every real-OKF-v0.2 family above, **plus** AKCP-specific governance fields that are not part of Google's spec at all: `schemaVersion`, `bundleVersion`, `priority`, `owner`, `lastReviewedAt`, `reviewCadenceDays`, `successor`. AKCP's own `index.md` convention (set by `akcp init`) also declares `type: Index`, which real OKF v0.2 doesn't require or expect — both forms parse correctly through AKCP's compiler.

**In practice this means:** a bundle written to the real Google OKF v0.2 spec compiles through AKCP as-is (see the applied example below); a bundle using AKCP's extra governance fields is not a valid *pure* OKF v0.2 bundle, but AKCP still processes it since those extra fields ride along via the same schema's `.passthrough()`.

---

## Bundle Structure

An OKF bundle is a directory of Markdown concept files, optionally organized into subdirectories by entity type. Each file represents a single knowledge concept.

```
my-domain/
├── index.md               # Optional root catalog (okf_version may go here)
├── log.md                 # Optional dated changelog
├── akcp.yaml              # AKCP build configuration (AKCP-specific, not part of OKF)
├── skills/
│   ├── index.md           # Directory catalog
│   ├── typescript.md      # A single "Skill" concept
│   └── python.md
└── processes/
    ├── index.md
    └── incident-response.md
```

---

## Concept File Format

Every OKF concept file starts with a `---`-delimited YAML frontmatter block, followed by the Markdown body:

```markdown
---
type: "BigQuery Table"
title: "Nightly Revenue Rollup"
resource: "bq://my-project.finance.revenue_nightly"
tags: [finance, revenue]
sources:
  - resource: "sql/revenue_rollup.sql"
    author: "human:alice"
generated:
  by: "reference_agent/gemini-2.5-pro"
  at: "2026-06-01T00:00:00Z"
verified:
  by: "human:alice"
  at: "2026-06-02T09:00:00Z"
status: stable
---

This table aggregates nightly revenue across all regions...
```

### Frontmatter Rules

| Field | Required | Description |
|-------|----------|--------------|
| `type` | ✅ Yes | The only field OKF v0.2 requires — a free-form string identifying the concept kind |
| `title`, `description`, `resource`, `tags` | No | Recommended, not required |
| `sources`, `usage_window` | No | Provenance — what the concept was derived from |
| `generated`, `verified` | No | Trust — who produced/verified the content |
| `status`, `stale_after` | No | Lifecycle — `status` defaults to `stable` if absent |
| `runtime`, `parameters`, `computation`, `executor`, `attester` | No | Computation family, relevant to `type: "Attested Computation"`-style concepts |
| *(custom fields)* | No | Any unknown keys are **preserved** in AK-IR metadata |

> **Unknown keys are always preserved.** AKCP does not discard custom frontmatter fields — they flow through to the AK-IR `frontmatter` object intact, per OKF v0.2's own conformance rule that consumers must not reject a bundle over unknown keys.

---

## OKF → AK-IR Mapping

The AKCP compiler normalizes OKF bundles into the [Agent Knowledge IR](ak-ir.md):

| OKF Element | AK-IR Equivalent |
|-------------|-----------------|
| A `.md` file | An `IRConcept` node |
| `type` frontmatter | `IRConcept.type` |
| Markdown body | `IRConcept.body` |
| All frontmatter | `IRConcept.frontmatter` |
| Markdown links | `IRLink` edges in the entity graph |
| Bundle directory | `AgentKnowledgeIR.bundleId` |
| Root `index.md`'s `okf_version` | `AgentKnowledgeIR.okfVersion` (`"unspecified"` if the bundle didn't declare one — a valid omission per spec) |

---

## Diagnostics

The OKF adapter produces structured diagnostics during compilation:

| Level | Condition |
|-------|-----------|
| **Error** | Malformed YAML frontmatter for a file that attempted one |
| **Warning** | Frontmatter was attempted but missing the required `type` field (`index.md`/`log.md` are exempt — they're reserved structural files, not concepts) |
| **Info** | Successful normalizations; unknown key preservation events |

---

## Applied Example: a real Google OKF v0.2 bundle compiled through AKCP

[`examples/domains/google-okf-demo/`](../../examples/domains/google-okf-demo/) is written entirely to the real spec — no AKCP-specific governance fields — and compiles through the same `akcp compile` pipeline as every other example. It demonstrates the provenance (`sources`), trust (`generated`/`verified`), lifecycle (`status`/`stale_after`), and computation (`runtime`/`parameters`/`executor`/`attester`) families, plus a bundle-root `index.md` declaring `okf_version: "0.2"`. See its [WALKTHROUGH.md](../../examples/domains/google-okf-demo/WALKTHROUGH.md) for a real captured transcript.

---

## Related Docs

- [Agent Knowledge IR (AK-IR)](ak-ir.md) — the compiled output of OKF ingestion
- [Compiler Pipeline](compiler.md) — the full build pipeline
- [AKCP Build Spec](../specs/akcp-build-spec.md) — configuring `akcp.yaml`
- [Create a Domain Adapter](../guides/create-domain-adapter.md) — extending OKF for new domains
