# Use Cases for AKCP Orchestrator

This document outlines scenarios where Agent-Ready Knowledge and Context Packs dramatically outperform ad-hoc LLM prompting.

## 1. Autonomous Software Engineering (e.g., Cline, Copilot)
**The Problem:** Coding agents often hallucinate dependencies, use deprecated APIs, or break architectural boundaries because they scan raw source code without understanding the "Why".
**The Solution:** An `AGENTS.md` file points the agent to a `.agent-context/` directory (Context Pack). The pack strictly defines the architecture, forbidden modules, and deployment constraints using structured YAML/Markdown (OKF).

## 2. Enterprise Policy & Compliance Bots
**The Problem:** A standard RAG pipeline pulling from an unstructured intranet often retrieves outdated policies or mixes up localized rules, leading to confident but incorrect compliance advice.
**The Solution:** Context Packs are explicitly versioned and validated via the `akcp validate` CLI. The MCP Profile Server surfaces only the exact, validated policies relevant to the user's domain, cutting hallucination rates to near-zero.

## 3. High-Risk Automated Workflows (e.g., Applying for Jobs, Submitting PRs)
**The Problem:** Agents executing workflows on behalf of humans (via raw MCP) can be tricked by Prompt Injection or excessive agency into submitting destructive actions.
**The Solution:** The AKCP Capability Registry enforces *Local-Read* vs *External-Submit* boundaries. The `confirm_application_submission` tool requires a human-in-the-loop (HITL) approval token generated earlier in the pipeline, enforcing proportional autonomy.

## 4. Cross-Agent Collaboration
**The Problem:** You have a Researcher Agent and a Coder Agent. Passing the entire chat history between them blows up the token budget and dilutes focus.
**The Solution:** The Researcher Agent uses the `build_context_pack` tool to select, compress, and compile its findings into a strict OKF bundle. The Coder Agent boots up, ingests *only* the compiled Context Pack, and starts executing.
