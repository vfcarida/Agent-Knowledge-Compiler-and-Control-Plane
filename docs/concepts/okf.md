# Open Knowledge Format (OKF)

The **Open Knowledge Format (OKF)** is a portable, vendor-neutral standard for structuring organizational knowledge. OKF knowledge is authored as Markdown files with structured YAML frontmatter, making it readable by both humans and AI agents without heavy SDK dependencies.

OKF was initiated by Google Cloud as a mechanism for sharing structured knowledge across systems. AKCP uses OKF as its primary source format — the human-readable input that the compiler transforms into machine-optimized [Agent Knowledge IR (AK-IR)](ak-ir.md).

> See the [OKF Specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) for the full protocol definition.

---

## Bundle Structure

An OKF bundle is a directory of Markdown concept files organized by entity type. Each file represents a single knowledge concept.

```
my-domain/
├── index.md               # Root catalog (required)
├── akcp.yaml              # AKCP build configuration
├── capabilities.json      # Capability registry declarations
├── skills/
│   ├── index.md           # Directory catalog
│   ├── typescript.md      # A single "Skill" concept
│   └── python.md
├── processes/
│   ├── index.md
│   └── incident-response.md
└── policies/
    ├── index.md
    └── data-handling.md
```

---

## Concept File Format

Every OKF concept file starts with a `---`-delimited YAML frontmatter block, followed by the Markdown body:

```markdown
---
type: Skill
name: TypeScript
level: Expert
tags: [programming, backend, frontend]
lastReviewed: 2026-07-01
---

TypeScript is a strongly typed superset of JavaScript. This concept documents
proficiency, standard patterns, and project applications.

## Key Patterns

- Strict mode enabled in all projects
- Zod for runtime validation
- `ts-node` / `tsx` for development
```

### Frontmatter Rules

| Field | Required | Description |
|-------|----------|-------------|
| `type` | ✅ Yes | The entity type (e.g., `Skill`, `Process`, `Policy`, `Runbook`) |
| `name` | ✅ Yes | Human-readable display name |
| `tags` | No | Taxonomy tags for search and filtering |
| `lastReviewed` | No | ISO 8601 date for lifecycle freshness tracking |
| *(custom fields)* | No | Any unknown keys are **preserved** in AK-IR metadata |

> **Unknown keys are always preserved.** AKCP does not discard custom frontmatter fields — they flow through to the AK-IR `frontmatter` object intact.

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

---

## Diagnostics

The OKF adapter produces structured diagnostics during compilation:

| Level | Condition |
|-------|-----------|
| **Error** | Malformed YAML frontmatter; missing required `type` field for a known concept type |
| **Warning** | Unknown `type` values detected (tolerated but flagged); broken internal markdown links |
| **Info** | Successful normalizations; unknown key preservation events |

---

## Related Docs

- [Agent Knowledge IR (AK-IR)](ak-ir.md) — the compiled output of OKF ingestion
- [Compiler Pipeline](compiler.md) — the full build pipeline
- [AKCP Build Spec](../specs/akcp-build-spec.md) — configuring `akcp.yaml`
- [Create a Domain Adapter](../guides/create-domain-adapter.md) — extending OKF for new domains
