---
layout: home

hero:
  name: "AKCP Documentation"
  text: "Agent Knowledge Compiler & Control Plane"
  tagline: "Compile organizational knowledge into versioned, agent-consumable artifacts with runtime governance."
  actions:
    - theme: brand
      text: Quickstart Guide
      link: /getting-started/quickstart
    - theme: alt
      text: Architecture Overview
      link: /architecture/
    - theme: alt
      text: GitHub Repository
      link: https://github.com/vfcarida/Agent-Knowledge-Compiler-and-Control-Plane

features:
  - title: Deterministic Compilation
    details: Compiles Markdown and OKF sources into versioned, deterministic Agent Knowledge IR bundles with sub-second performance.
  - title: Runtime Control Plane
    details: Granular capability policies, human-in-the-loop approvals, token budgeting, and cryptographic audit trails.
  - title: MCP Native Protocol
    details: Built-in Model Context Protocol servers for runtime profiles and automation execution across tools and agents.
---

# Documentation Hub

Welcome to the **Agent Knowledge Compiler and Control Plane (AKCP)** documentation. Use the sections below or the sidebar to navigate every part of the project.

<p align="center">
  <img src="/akcp-workflow.svg" alt="AKCP Architecture and Zero-to-Control-Plane Flow" width="100%" />
</p>

---

## 🚀 Start Here

| Page                                                  | Description                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| [Quickstart](getting-started/quickstart.md)           | Install, build, and run your first compilation in under 10 minutes |
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

| Page                                            | Description                                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Architecture Overview](architecture/README.md) | Diagrams for the compiler pipeline, control plane, MCP integration, and domain lifecycle |

---

## 🖥️ CLI Reference

| Page                              | Description                                    |
| --------------------------------- | ---------------------------------------------- |
| [CLI Reference](reference/cli.md) | All `akcp` commands, flags, and usage examples |

---

## 🔌 MCP Integration & Security

| Page                                                         | Description                                               |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| [MCP Tool Contracts](specs/mcp-tool-contracts.md)            | Structured `ToolSuccess`/`ToolFailure` response contracts |
| [MCP Security](security/mcp-security.md)                     | Security model for MCP profile and automation servers     |
| [MCP Zero-Trust Gateway](security/mcp-zero-trust-gateway.md) | How AKCP enforces least-privilege execution               |
| [Capability Registry](security/capability-registry.md)       | How tool capabilities are declared and enforced           |
| [Human-in-the-Loop (HITL)](security/hitl.md)                 | Approval workflows for high-risk agent actions            |
| [Automation Safety](security/automation-safety.md)           | Browser automation safety controls                        |
| [Threat Model](security/threat-model.md)                     | STRIDE analysis for AKCP attack surfaces                  |

---

## 📄 OKF / AK-IR Specifications

| Page                                            | Description                                            |
| ----------------------------------------------- | ------------------------------------------------------ |
| [AKCP Build Spec](specs/akcp-build-spec.md)     | Full specification for `akcp.yaml` build configuration |
| [AKCP YAML Reference](specs/akcp-yaml.md)       | Field-level reference for `akcp.yaml`                  |
| [Compile Targets](reference/compile-targets.md) | All supported output targets and their configurations  |
| [Versioning Policy](specs/versioning.md)        | How AKCP versions schemas and artifacts                |
| [Policy Cards](specs/policy-cards.md)           | Machine-readable governance templates                  |
| [Context Budget](specs/context-budget.md)       | Token budgeting and cost controls                      |

---

## 🏛️ Governance & Risk

| Page                                                     | Description                                                |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| [Autonomy Levels](governance/autonomy-levels.md)         | Definitions: advise, execute-with-approval, execute        |
| [NIST AI RMF Mapping](governance/nist-ai-rmf-mapping.md) | Mapping AKCP controls to NIST AI Risk Management Framework |
| [OWASP LLM Controls](governance/owasp-llm-controls.md)   | AKCP mitigations for OWASP Top 10 LLM risks                |
| [Risk Register](governance/risk-register.md)             | Known project risks and mitigations                        |
| [Project Status](status.md)                              | Current project status, metrics, and roadmap               |
