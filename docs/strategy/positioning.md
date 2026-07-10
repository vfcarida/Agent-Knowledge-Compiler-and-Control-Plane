# Strategic Positioning: AKCP

## Thesis
**AKCP** is the discipline of transforming fragmented organizational knowledge into versioned, governed, and interoperable context packs for AI agents, using a lightweight Open Knowledge Format (OKF) specification exposed securely via the Model Context Protocol (MCP).

## Tagline
A standard toolkit for building governed, akcp context supply chains.

## Anti-Thesis
This is **not** an enterprise wiki, nor is it a complex RAG (Retrieval-Augmented Generation) pipeline that chunks data into vector databases. It does not attempt to be an all-encompassing orchestration framework like LangChain or LlamaIndex.

## Target Audience (Personas)
1. **AI / Platform Engineer:** Needs a standardized, deterministic way to feed exact context boundaries into agentic orchestrators without building bespoke parsers or vector databases.
2. **Enterprise Architect:** Requires a strict governance model (Human-in-the-Loop, Auditing, NIST AI RMF compliance) to prove that agentic workflows will not hallucinate policies, leak sensitive data, or execute unauthorized external actions.
3. **Developer (Agent Users):** Wants a fast CLI and local server to keep their agent's understanding of their codebase, domain, or personal context fully synchronized across tools like Claude Desktop, Cursor, or custom MCP clients.

## The Wedge (Immediate Problem Solved)
Agents today fail not because they lack reasoning, but because they lack **clean, deterministic context**. Developers and platform teams struggle to keep context synchronized across different agent frameworks (Cline, Cursor, Custom MCP). 

This project provides a **zero-setup CLI** (`validate`, `migrate`) and a pre-hardened **MCP Server** to instantly mount a governed, typed, Markdown-based directory as universal context for any agent. If you can write Markdown, you can supply context to an agent securely.

## Why Now?
The market is shifting from "chatbots" to "task-specific autonomous agents." Gartner predicts rapid adoption by 2026, but also warns that a massive portion of agentic projects will fail due to uncertain ROI and inadequate risk controls. A disciplined approach to context supply chains (AKCP) is the bridge between experimental agent demos and production enterprise adoption.

## Why OKF?
Google's Open Knowledge Format (OKF) is an open, vendor-neutral specification. It uses simple UTF-8 Markdown with YAML frontmatter. This guarantees:
- **Human Readability:** Humans can author and review it without special tools.
- **Agent Readability:** Agents can parse structured metadata natively.
- **Portability:** No proprietary schema registries or complex databases are required.

## Why MCP?
The Model Context Protocol (MCP) by Anthropic standardizes how AI hosts connect to data sources. By exposing OKF bundles via MCP:
- We remove integration lock-in. Any MCP-compliant client (Claude Desktop, custom clients) can instantly read the context.
- We enable strict security perimeters (authorization, scoping, tool execution boundaries) out of the box.

## Differentiation
- **vs. OpenWiki:** OpenWiki focuses strictly on maintaining codebase documentation for agents. AKCP generalizes this into a standard for *any* domain knowledge (HR policies, career profiles, system architectures) while enforcing enterprise governance.
- **vs. Traditional Wikis (Notion, Confluence):** Traditional wikis are optimized for human eyes (rich text, nested pages). AKCP is optimized for agent ingestion (strict YAML metadata, schema validation).
- **vs. RAG Pipelines:** RAG relies on probabilistic retrieval and vector similarities, which often hallucinate or retrieve irrelevant chunks. AKCP relies on deterministic, structured context packs.
- **vs. Standalone MCP Servers:** A raw MCP server is just a protocol endpoint. AKCP provides the full lifecycle: formatting (OKF), validation (CLI), exposure (MCP Profile), and safety boundaries (MCP Automation with HITL).
- **vs. Classical Knowledge Graphs:** Graph databases require specialized query languages (SPARQL, Cypher). AKCP uses flat file directories and standard Markdown, massively lowering the barrier to entry.

## Roadmap of Adoption
1. **Individual Developers:** Adopt AKCP to manage personal or project-specific context (e.g., the Career Profile example) and inject it into local coding assistants.
2. **Platform Teams:** Deploy centralized OKF bundles via remote MCP servers to standardize agent context across internal engineering squads.
3. **Enterprise Rollout:** Integrate AKCP with internal CI/CD pipelines to ensure that every policy or architecture change automatically triggers context validation and agent re-evaluations.
