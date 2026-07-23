# AKCP Documentation Hub

Welcome to the **Agent Knowledge Compiler and Control Plane (AKCP)** documentation. Use this page as your starting point to navigate every section of the project.

> For a concise project overview, see the [root README](../README.md).

---

## 🚀 Start Here

| Page                                                  | Description                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| [Quickstart](getting-started/quickstart.md)           | Install, build, and run your first compilation in under 10 minutes |
| [API Reference](api/)                                 | Auto-generated TypeDoc reference (run `pnpm docs:api` locally)     |
| [Troubleshooting](getting-started/troubleshooting.md) | Common setup errors and how to resolve them                        |
| [Development Setup](getting-started/development.md)   | Configure a local contributor environment                          |
| [Examples Overview](getting-started/examples.md)      | Browse all flagship domain examples                                |

---

## 🧠 Core Concepts

| Page                                            | Description                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| [Compiler Pipeline](concepts/compiler.md)       | How AKCP transforms raw docs into agent-consumable artifacts     |
| [Control Plane](concepts/control-plane.md)      | Runtime governance: capabilities, approvals, policy cards, audit |
| [Open Knowledge Format (OKF)](concepts/okf.md)  | The portable markdown+YAML knowledge authoring format            |
| [Agent Knowledge IR (AK-IR)](concepts/ak-ir.md) | The compiled intermediate representation consumed at runtime     |
| [OpenWiki Integration](concepts/openwiki.md)    | How AKCP integrates with OpenWiki for codebase documentation     |
| [Source Connectors](concepts/connectors.md)     | Plugins for ingesting knowledge from external systems            |
| [Glossary](glossary.md)                         | Definitions for all AKCP-specific terms                          |

---

## 🏗️ Architecture

| Page                                            | Description                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [Architecture Overview](architecture/README.md) | Diagrams for the compiler pipeline, control plane, MCP integration, domain lifecycle, and supply chain |

---

## 🖥️ CLI Reference

| Page                              | Description                                    |
| --------------------------------- | ---------------------------------------------- |
| [CLI Reference](reference/cli.md) | All `akcp` commands, flags, and usage examples |

---

## 🔌 MCP Integration

| Page                                                         | Description                                               |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| [MCP Tool Contracts](specs/mcp-tool-contracts.md)            | Structured `ToolSuccess`/`ToolFailure` response contracts |
| [MCP Security](security/mcp-security.md)                     | Security model for MCP profile and automation servers     |
| [MCP Zero-Trust Gateway](security/mcp-zero-trust-gateway.md) | How AKCP enforces least-privilege execution               |
| [Capability Registry](security/capability-registry.md)       | How tool capabilities are declared and enforced           |

---

## 📄 OKF / AK-IR Specifications

| Page                                            | Description                                            |
| ----------------------------------------------- | ------------------------------------------------------ |
| [OKF Concepts](concepts/okf.md)                 | Open Knowledge Format authoring guide                  |
| [AK-IR Concepts](concepts/ak-ir.md)             | Intermediate representation specification              |
| [AKCP Build Spec](specs/akcp-build-spec.md)     | Full specification for `akcp.yaml` build configuration |
| [AKCP YAML Reference](specs/akcp-yaml.md)       | Field-level reference for `akcp.yaml`                  |
| [Compile Targets](reference/compile-targets.md) | All supported output targets and their configurations  |
| [Versioning Policy](specs/versioning.md)        | How AKCP versions schemas and artifacts                |

---

## 🎛️ Control Plane

| Page                                                | Description                                             |
| --------------------------------------------------- | ------------------------------------------------------- |
| [Control Plane Concepts](concepts/control-plane.md) | Capability registry, policy cards, approvals, and audit |
| [Policy Cards](specs/policy-cards.md)               | Machine-readable governance templates                   |
| [Human-in-the-Loop (HITL)](security/hitl.md)        | Approval workflows for high-risk agent actions          |
| [Autonomy Levels](governance/autonomy-levels.md)    | Definitions: advise, execute-with-approval, execute     |
| [Context Budget](specs/context-budget.md)           | Token budgeting and cost controls                       |

---

## 🔐 Security & Governance

| Page                                                     | Description                                                |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| [Threat Model](security/threat-model.md)                 | STRIDE analysis for AKCP attack surfaces                   |
| [Automation Safety](security/automation-safety.md)       | Browser automation safety controls                         |
| [Supply Chain Security](security/supply-chain.md)        | SBOM, provenance, and artifact attestation                 |
| [Artifact Integrity](security/artifact-integrity.md)     | Verification of compiled artifact integrity                |
| [Plugin Security](security/plugin-security.md)           | Security controls for third-party plugins                  |
| [NIST AI RMF Mapping](governance/nist-ai-rmf-mapping.md) | Mapping AKCP controls to NIST AI Risk Management Framework |
| [OWASP LLM Controls](governance/owasp-llm-controls.md)   | AKCP mitigations for OWASP Top 10 LLM risks                |
| [Security Review](security/security-review.md)           | Security review process and checklist                      |

---

## 🧪 Evals & Conformance

| Page                                                   | Description                                           |
| ------------------------------------------------------ | ----------------------------------------------------- |
| [Testing Guide](guides/testing.md)                     | Unit, integration, contract, and eval test strategies |
| [Conformance Specification](specs/conformance.md)      | OKF and AKCP conformance rules                        |
| [Conformance Levels](governance/conformance-levels.md) | L1–L4 conformance level definitions                   |
| [Scorecard](reference/scorecard.md)                    | Project-level quality scorecard                       |

---

## 🌐 Domain Walkthroughs

| Page                                                           | Description                                                            |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [IT Operations Domain](walkthroughs/it-ops.md)                 | **Beta (Flagship)** — Enterprise runbooks, incidents, approvals, audit |
| [Career Domain](walkthroughs/career.md)                        | **Stable (Starter)** — Personal knowledge compilation starter domain   |
| [Customer Support Domain](concepts/customer-support-design.md) | **Experimental** — Policy-aware, PII-preserving support knowledge      |

---

## 🏢 Enterprise

| Page                                                    | Description                                    |
| ------------------------------------------------------- | ---------------------------------------------- |
| [Agent Identity](reference/agent-identity.md)           | How AKCP identifies and authenticates agents   |
| [AKCP Profile Reference](reference/akcp-profile.md)     | Enterprise profile configuration options       |
| [Context Economics](reference/context-economics.md)     | Token cost analysis and optimization           |
| [Knowledge Lifecycle](reference/knowledge-lifecycle.md) | From authoring to deprecation                  |
| [Provenance](reference/provenance.md)                   | Artifact lineage and supply chain traceability |
| [Risk Register](governance/risk-register.md)            | Known project risks and mitigations            |

---

## 🤝 Contributing

| Page                                             | Description                                                  |
| ------------------------------------------------ | ------------------------------------------------------------ |
| [Contributing Guide](../CONTRIBUTING.md)         | How to contribute code, docs, and domain profiles            |
| [Release Process](release/release-process.md)    | Pre-release checklist and post-release artifact verification |
| [Spec Governance](governance/spec-governance.md) | How AKCP specifications are proposed and ratified            |
| [RFC Process](governance/rfc-process.md)         | Request for Comments process                                 |
| [RFC Template](rfcs/template.md)                 | Template for submitting new RFCs                             |
| [ADRs](adrs/README.md)                           | Architectural Decision Records                               |
| [Release Policy](governance/release-policy.md)   | Versioning, deprecation, and release cadence                 |
| [Roadmap](governance/roadmap.md)                 | Community roadmap and milestone planning                     |
| [Maturity Model](project/maturity-model.md)      | Feature and command maturity level definitions               |
| [Migration Guide](migrations/legacy-naming.md)   | Migrating from legacy OCF/Agent-ready naming                 |

---

## 📋 Specifications Index

See the [Specs README](specs/README.md) for a full index of all formal specifications.
