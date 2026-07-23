# Glossary

This glossary defines terms specific to the **Agent Knowledge Compiler and Control Plane (AKCP)** ecosystem. Terms are listed alphabetically.

---

## A

### AKCP
**Agent Knowledge Compiler and Control Plane.** The open-source project that compiles organizational knowledge into governed, versioned, testable, cost-aware, agent-consumable artifacts, and controls how agents discover, retrieve, use, and act on that knowledge through MCP-compatible capabilities.

### AK-IR
**Agent Knowledge Intermediate Representation.** The deterministic, JSON-serializable data structure produced by the AKCP compiler. AK-IR is the compiled form of an OKF bundle — the structured intermediate that the Control Plane (MCP servers, policy engines) consumes at runtime. Analogous to a compiled binary in traditional software build systems.

### Approval
A Human-in-the-Loop (HITL) gate that pauses agent execution before a high-risk tool call. Approvals are stored in a time-limited token store and must be granted by an authorized human operator before the agent is permitted to proceed.

### Artifact
A compiled output of the AKCP compiler. Artifacts include Context Packs, MCP Resource Manifests, OpenWiki documents, agent instructions, and eval datasets. All artifacts carry provenance metadata linking them to their source OKF bundles.

### Autonomy Level
A classification of how much authority an agent has to execute actions without human approval. AKCP defines three levels: `advise` (suggest only), `execute-with-approval` (pause for HITL), and `execute` (autonomous execution within capability bounds).

---

## B

### Budget (Context Budget)
The pre-computed token or character limit associated with a compiled concept or context pack. Budgets are enforced at build time to ensure agent context windows are not exceeded at runtime.

### Bundle
A directory of OKF-formatted knowledge files (Markdown + YAML frontmatter) that represents a single logical knowledge domain. Bundles are the primary input to the AKCP compiler.

---

## C

### Capability
A declared, machine-readable description of a tool or resource an agent is authorized to use. Capabilities are registered in the Capability Registry and checked at runtime before tool execution is permitted.

### Capability Registry
The runtime index of all declared agent capabilities within an AKCP domain. The registry maps capability IDs to their schemas, risk levels, side-effect classifications, and required approval gates.

### Compile Target
A named output format that the AKCP compiler can produce from an AK-IR. Examples: `mcp-profile-server` (MCP resource manifest), `context-pack` (optimized JSON for direct LLM injection), `openwiki` (structured codebase documentation), `agent-instructions` (prompt-ready summaries), `eval-dataset` (evaluation test cases).

### Conformance
The degree to which an OKF bundle or AKCP implementation adheres to the published specifications. AKCP defines four conformance levels: L1 (basic), L2 (validated), L3 (governed), L4 (audited).

### Context Pack
A compiled artifact optimized for direct injection into an LLM context window. Context Packs are semantically dense, token-budgeted JSON files derived from AK-IR concepts.

### Control Plane
The runtime governance layer of AKCP. The Control Plane manages how agents discover capabilities, what they are permitted to execute, how approvals are requested and granted, and how all actions are recorded in the Evidence Store.

---

## D

### Domain
A logical grouping of knowledge within AKCP (e.g., `career`, `it-operations`, `customer-support`). Each domain has its own OKF bundle, compiled artifacts, capability registry, and policy cards.

### Domain Adapter
A plugin that maps domain-specific knowledge structures to the generic OKF format. Domain adapters enable AKCP to ingest knowledge from domain-specific sources (e.g., Zendesk tickets, PagerDuty runbooks) without modifying the core compiler.

---

## E

### Evidence Store
The immutable audit log maintained by the Control Plane. Every token consumed, capability invoked, approval requested, and tool call executed is recorded in the Evidence Store with a tamper-evident chain of provenance.

---

## H

### HITL
**Human-in-the-Loop.** An approval mechanism that pauses autonomous agent execution and requires explicit confirmation from a human operator before a high-risk action proceeds. AKCP enforces HITL through time-limited approval tokens.

---

## M

### MCP
**Model Context Protocol.** An open protocol that standardizes how AI applications expose and consume tools, resources, and prompts. AKCP wraps MCP with additional governance controls: capability registries, risk-level declarations, budget enforcement, and audit telemetry.

---

## O

### OKF
**Open Knowledge Format.** A portable, Markdown + YAML specification for structuring organizational knowledge in a way that is both human-readable and machine-parseable. OKF is the primary source format consumed by the AKCP compiler. Originally specified by the Google Cloud team.

### OpenWiki
An open-source project by LangChain that enables AI-powered documentation of codebases. AKCP can compile knowledge bundles into OpenWiki-compatible output as one of its compile targets.

---

## P

### Policy Card
A machine-readable governance document that constrains an agent's behavior within a domain. Policy Cards specify: which capabilities are available, what autonomy level is required, what data handling rules apply (e.g., PII redaction), and what audit requirements are in effect.

### Provenance
The metadata chain that traces a compiled artifact back to its original source. AKCP records source file paths, content hashes, build timestamps, and compilation parameters for every artifact, enabling full supply chain traceability.

---

## S

### SBOM
**Software Bill of Materials.** A formal list of all components included in a software artifact. AKCP generates SBOMs for compiled artifacts as part of its supply chain security posture.

### Side Effect
A capability-level classification indicating whether a tool call modifies external state (e.g., deploys infrastructure, sends an email, deletes a record). Side effects are declared in the Capability Registry and trigger elevated approval requirements.

---

## T

### Tool Contract
A formal, typed schema that defines the input parameters, output shape (`ToolSuccess<T>` / `ToolFailure`), and error codes for an MCP tool exposed by an AKCP server.
