# Agent Knowledge Compiler and Control Plane (AKCP)

[![CI](https://github.com/vfcarida/Agent-Knowledge-Compiler-and-Control-Plane/actions/workflows/ci.yml/badge.svg)](https://github.com/vfcarida/Agent-Knowledge-Compiler-and-Control-Plane/actions/workflows/ci.yml)

Agent Knowledge Compiler and Control Plane (AKCP) is an open-source system for compiling organizational knowledge into governed, versioned, testable, cost-aware, agent-consumable artifacts, and for controlling how agents discover, retrieve, use, and act on that knowledge through MCP-compatible capabilities.

📖 **[Full Documentation →](docs/README.md)** | [Quickstart](docs/getting-started/quickstart.md) | [Architecture](docs/architecture/README.md) | [Glossary](docs/glossary.md)

## What AKCP is

AKCP explicitly separates the lifecycle of agent knowledge into two operational planes:

1. **Compiler Pipeline**: Ingests raw organizational knowledge (docs, wikis, runbooks), normalizes it into OKF and AK-IR formats, and compiles it into semantically dense, strictly-typed artifacts (Context Packs, MCP Resources, OpenWiki Docs, Eval datasets).
2. **Control Plane**: Governs how autonomous agents interact with these artifacts at runtime. It features a capability registry, machine-readable policy cards, strict Human-In-The-Loop (HITL) approvals, and full audit telemetry.

## What AKCP is not

- **Not just a vector database or probabilistic RAG pipeline**: AKCP focuses on determinism, governance, and static context compilation.
- **Not a generic framework for building AI agents**: AKCP does not orchestrate agents (like LangGraph or AutoGen). Instead, it provides the deterministic _context_ and _capabilities_ those agents consume.
- **Not OpenWiki**: OpenWiki _authors_ and maintains codebase documentation. AKCP _compiles and governs_ knowledge across formats.
- **Not OKF**: OKF provides a minimal portable knowledge format. AKCP implements the runtime orchestrator around it.
- **Not MCP**: MCP provides a protocol for tools and resources. AKCP wraps MCP with budgetary controls and governance.

## Why this matters

AI agents today suffer from structural hallucination: they lack deterministic grounding. Enterprises cannot afford unpredictable agentic behavior, especially when agents have side-effect capabilities (e.g., executing scripts, deploying infrastructure). Standard tools solve parts of the problem, but fail to provide a cohesive supply chain from raw documentation to controlled agent side-effects. AKCP solves this by treating knowledge and tools as governed, versioned artifacts.

## Architecture at a glance

```mermaid
flowchart LR
  Sources[Knowledge Sources] --> OKF[OKF Bundles]
  OKF --> IR[AK-IR]
  IR --> Compiler[AKCP Compiler]
  Compiler --> Artifacts[Compiled Artifacts]
  Artifacts --> MCP[MCP Resources / Tools / Prompts]
  Artifacts --> Packs[Context Packs]
  Artifacts --> OpenWiki[OpenWiki Docs]
  MCP --> Control[Control Plane]
  Control --> Policy[Policy Cards]
  Control --> Audit[Audit Evidence]
  Control --> Evals[Evals]
```

## Compiler Pipeline

The AKCP compiler treats organizational knowledge like source code:
1. **Source**: Knowledge is structured using [OKF (Open Knowledge Format)](docs/concepts/okf.md).
2. **IR**: It parses into the [Agent Knowledge IR (AK-IR)](docs/concepts/ak-ir.md) for AST-level validation and linkage.
3. **Target**: It generates optimized outputs via [Compile Targets](docs/reference/compile-targets.md) tailored for different agents and systems.

## Control Plane Model

At runtime, the Control Plane ensures safe agent execution:
1. **Capability Registry**: Maps tools and resources.
2. **Policy Cards**: Define strict constraints (e.g., [Policy Cards Spec](docs/specs/policy-cards.md)).
3. **Approvals**: Pauses execution for Human-In-The-Loop confirmation.
4. **Telemetry & Audit**: Logs every token and action for [Audit Evidence](docs/concepts/control-plane.md).

## Flagship Domains

To prove its domain-agnostic architecture, AKCP implements distinct flagship scenarios:

| Domain | Why it exists | What it demonstrates |
|---|---|---|
| Career | low-friction starter domain | personal knowledge compilation |
| IT Operations | enterprise flagship | runbooks, incidents, approvals, audit |
| Customer Support | third flagship enterprise use case for policy-aware, privacy-preserving support knowledge compilation | showing how AKCP handles tickets, macros, policies, customer history, PII redaction, escalation, and quality evaluation |

## Current Maturity Status

| Area | Status | Evidence | Limitation | Next milestone |
|---|---|---|---|---|
| AKCP CLI compile | Beta | tests + examples | no npm release yet | global CLI distribution |
| AK-IR | Beta | spec + fixtures | requires manual tuning | automatic normalization |
| MCP servers | Beta | contract tests | local-only | secure remote hosting |
| Control Plane (Automation) | Experimental | safety tests | missing dashboard | real e2e integrations |
| Dashboard UI | Experimental | package stubbed | no react UI | build MVP |
| Career flagship | Stable | walkthrough | limited tool scope | expansion |
| IT Ops flagship | Beta | architecture | mocked infrastructure | real cloud integrations |
| Customer Support | Experimental | design doc | experimental | integration |
| AKCP Legacy CLI (`akcp`) | Deprecated | CI check logic | legacy usage | removal in v1.0 |

For formal definitions, see the [Maturity and Status Guide](docs/status.md).

## Quickstart

### Local workspace flow

As AKCP is not yet published to npm, you must run it directly from source. For a complete step-by-step walkthrough, see the [Getting Started Guide](docs/getting-started/quickstart.md).

```bash
# 1. Clone the repository
git clone https://github.com/vfcarida/Agent-Knowledge-Compiler-and-Control-Plane.git akcp
cd akcp

# 2. Setup the environment
corepack enable
pnpm install --frozen-lockfile
pnpm build

# 3. Validate and compile the Career example domain
pnpm akcp validate --bundle examples/domains/career --profile career
pnpm akcp compile --config examples/domains/career/akcp.yaml

# 4. View generated artifacts in the cache
# (Look inside examples/domains/career/.akcp/cache/build-state.json)
```

## CLI Examples

The `akcp` CLI manages your knowledge bundles:

| Command          | Purpose                                | Example                                             |
| ---------------- | -------------------------------------- | --------------------------------------------------- |
| `akcp doctor`    | Validate local environment             | `akcp doctor`                                       |
| `akcp compile`   | Compile knowledge into AK-IR/artifacts | `akcp compile --config examples/career/akcp.yaml`   |
| `akcp validate`  | Validate bundle/spec/config            | `akcp validate --bundle examples/career`            |
| `akcp serve mcp` | Serve compiled artifacts through MCP   | `akcp serve mcp --profile career`                   |

For full details, see [CLI Usage](docs/reference/cli.md).

## Repository Structure

- `packages/core/`: The OKF parser, compiler, and AK-IR normalization engine.
- `packages/cli/`: The `akcp` command-line interface.
- `packages/mcp-profile-server/`: Exposes context via MCP.
- `packages/mcp-automation-server/`: Controls agentic side-effects via Playwright/HITL.
- `packages/conformance/`: Test suite for OKF and AKCP compatibility.
- `examples/domains/`: Working demo architectures for the flagship domains.

## Specs and Standards

AKCP relies on Spec-Driven Development:
- [Agent Knowledge IR (AK-IR)](docs/concepts/ak-ir.md)
- [AKCP Configuration (`akcp.yaml`)](docs/specs/akcp-yaml.md)
- [Compile Targets & Manifests](docs/reference/compile-targets.md)
- [Policy Cards](docs/specs/policy-cards.md)
- [Conformance Specification](docs/specs/conformance.md)

## MCP and OKF Compatibility

- AKCP natively supports the Model Context Protocol. See [MCP Security](docs/security/mcp-security.md) and [Tool Contracts](docs/specs/mcp-tool-contracts.md).
- AKCP acts as the orchestrator for [Open Knowledge Format (OKF)](docs/concepts/okf.md).

## Security and Governance

Security is embedded at the architectural level to mitigate MCP threats (like Tool Poisoning, SSRF, and Prompt Injection):
- [Threat Model](docs/security/threat-model.md)
- [Automation Safety](docs/security/automation-safety.md)
- [MCP Hardening](docs/security/mcp-hardening.md)
- [NIST AI RMF Mapping](docs/governance/nist-ai-rmf-mapping.md)
- [OWASP LLM Controls](docs/governance/owasp-llm-controls.md)

See [SECURITY.md](SECURITY.md) for incident response and vulnerability reporting.

## Testing and Conformance

Ensure quality by running the comprehensive test suite:
```bash
pnpm test -- --run
pnpm check:docs
pnpm check:links
```
For evaluation frameworks, see the [Evals Documentation](docs/guides/testing.md).

## Roadmap

See the [Community Roadmap](docs/governance/roadmap.md).

## Contributing & Community

AKCP is an open specification and ecosystem. We actively welcome community contributions, particularly:
- **New Domain Profiles**: specialized OKF mappings for new industries.
- **Compile Targets**: exporters for new vector databases or doc formats.
- **Connectors**: plugins to sync knowledge from external systems.
- **Policy Cards**: governance templates for specific compliance frameworks.
- **Eval Suites & Conformance Tests**: ensuring safety and standards.

To get started, please read [CONTRIBUTING.md](CONTRIBUTING.md) and review our [Governance and Specification Process](docs/governance/spec-governance.md).

## Backwards Compatibility & Migration

The repository was previously known as AKCP (AKCP), Agent Knowledge Compiler and Control Plane (AKCP), and Agent Knowledge Compiler and Control Plane (AKCP). Legacy CLI commands (`akcp`, `agent-ready`) continue to route to the main `akcp` binary while emitting a deprecation warning.

| Legacy Concept | Canonical AKCP Concept | Migration Status |
| --- | --- | --- |
| `AKCP (AKCP)` | Agent Knowledge Compiler and Control Plane (AKCP) | Identity updated. Internal references are deprecated. |
| `Agent Knowledge Compiler and Control Plane (AKCP)` | AKCP Control Plane | Identity updated. |
| `akcp` CLI command | `akcp` | Supported with deprecation warning. |
| `agent-ready` CLI command | `akcp` | Supported with deprecation warning. |

---

_Licensed under MIT._
