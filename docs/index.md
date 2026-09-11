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

---

## 🚀 Start Here

| Page                                                | Description                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| [Quickstart](/getting-started/quickstart)           | Install, build, and run your first compilation in under 10 minutes |
| [Troubleshooting](/getting-started/troubleshooting) | Common setup errors and how to resolve them                        |
| [Development Setup](/getting-started/development)   | Configure a local contributor environment                          |
| [Examples Overview](/getting-started/examples)      | Browse all flagship domain examples                                |

---

## 🧠 Core Concepts

| Page                                          | Description                                                      |
| --------------------------------------------- | ---------------------------------------------------------------- |
| [Compiler Pipeline](/concepts/compiler)       | How AKCP transforms raw docs into agent-consumable artifacts     |
| [Control Plane](/concepts/control-plane)      | Runtime governance: capabilities, approvals, policy cards, audit |
| [Open Knowledge Format (OKF)](/concepts/okf)  | The portable markdown+YAML knowledge authoring format            |
| [Agent Knowledge IR (AK-IR)](/concepts/ak-ir) | The compiled intermediate representation consumed at runtime     |
| [OpenWiki Integration](/concepts/openwiki)    | How AKCP integrates with OpenWiki for codebase documentation     |
| [Source Connectors](/concepts/connectors)     | Plugins for ingesting knowledge from external systems            |
| [Glossary](/glossary)                         | Definitions for all AKCP-specific terms                          |

---

## 🏗️ Architecture

| Page                                    | Description                                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Architecture Overview](/architecture/) | Diagrams for the compiler pipeline, control plane, MCP integration, and domain lifecycle |

---

## 🖥️ CLI Reference

| Page                            | Description                                    |
| ------------------------------- | ---------------------------------------------- |
| [CLI Reference](/reference/cli) | All `akcp` commands, flags, and usage examples |

---

## 🔌 MCP Integration & Security

| Page                                                       | Description                                               |
| ---------------------------------------------------------- | --------------------------------------------------------- |
| [MCP Tool Contracts](/specs/mcp-tool-contracts)            | Structured `ToolSuccess`/`ToolFailure` response contracts |
| [MCP Security](/security/mcp-security)                     | Security model for MCP profile and automation servers     |
| [MCP Zero-Trust Gateway](/security/mcp-zero-trust-gateway) | How AKCP enforces least-privilege execution               |
| [Capability Registry](/security/capability-registry)       | How tool capabilities are declared and enforced           |
| [Human-in-the-Loop (HITL)](/security/hitl)                 | Approval workflows for high-risk agent actions            |
| [Automation Safety](/security/automation-safety)           | Browser automation safety controls                        |
| [Threat Model](/security/threat-model)                     | STRIDE analysis for AKCP attack surfaces                  |

---

## 📄 OKF / AK-IR Specifications

| Page                                          | Description                                            |
| --------------------------------------------- | ------------------------------------------------------ |
| [AKCP Build Spec](/specs/akcp-build-spec)     | Full specification for `akcp.yaml` build configuration |
| [AKCP YAML Reference](/specs/akcp-yaml)       | Field-level reference for `akcp.yaml`                  |
| [Compile Targets](/reference/compile-targets) | All supported output targets and their configurations  |
| [Versioning Policy](/specs/versioning)        | How AKCP versions schemas and artifacts                |
| [Policy Cards](/specs/policy-cards)           | Machine-readable governance templates                  |
| [Context Budget](/specs/context-budget)       | Token budgeting and cost controls                      |

---

## 🏛️ Governance & Risk

| Page                                                   | Description                                                |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| [Autonomy Levels](/governance/autonomy-levels)         | Definitions: advise, execute-with-approval, execute        |
| [NIST AI RMF Mapping](/governance/nist-ai-rmf-mapping) | Mapping AKCP controls to NIST AI Risk Management Framework |
| [OWASP LLM Controls](/governance/owasp-llm-controls)   | AKCP mitigations for OWASP Top 10 LLM risks                |
| [Risk Register](/governance/risk-register)             | Known project risks and mitigations                        |
| [Project Status](/status)                              | Current project status, metrics, and roadmap               |
