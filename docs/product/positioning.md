# AKCP Product Positioning

## Target Personas
1. **Platform Engineers / Enterprise Architects:** Tasked with securely rolling out AI agents across the enterprise without leaking PII or allowing rogue AI actions. They need governance, policy-as-code, and audit logs.
2. **AI Engineers / Agent Developers:** Frustrated by context limits, hallucinations, and writing brittle custom tool endpoints. They need deterministic context packs and pre-hardened MCP servers.

## Core Pains
- **Excessive Agency:** Agents taking unapproved actions because raw APIs were exposed.
- **Context Collapse:** Agents hallucinating because RAG retrieved conflicting or outdated chunks.
- **Siloed Context:** Having to rewrite context separately for Cursor, Cline, and background cron-agents.

## Alternatives & Differentiation

| Alternative | What it is | Why AKCP is Different |
|---|---|---|
| **Raw MCP Server** | Exposes local tools/resources via JSON-RPC. | AKCP wraps MCP in a Control Plane, adding NIST/OWASP Policy Engines, strict Capability Registries, and HITL approval queues. |
| **Vector DB (RAG)** | Probabilistic retrieval of semantic chunks. | AKCP is **deterministic**. It compiles Markdown+YAML into rigid OKF bundles. You know exactly what the agent reads. |
| **OpenWiki** | Upstream authoring and CI maintenance of AI docs. | OpenWiki *authors* knowledge. AKCP *compiles* and *controls* it at runtime. OpenWiki is a great upstream feeder for AKCP. |
| **LangChain/LlamaIndex** | Orchestration frameworks to build agents. | AKCP is an infrastructure layer, not an orchestrator. Your LangChain agent connects to the AKCP Control Plane to receive its context safely. |

## The Pitch
> Stop treating AI context as an afterthought. **AKCP** is the industry's first Agent Knowledge Compiler and Control Plane. We compile your messy markdown into deterministic context packs, and our MCP Control Plane ensures your agents only execute what they're explicitly authorized to do, with zero-trust HITL governance built-in.
