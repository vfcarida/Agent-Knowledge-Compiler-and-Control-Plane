# Manifesto: Agent-Ready Knowledge

## Definition
**Agent-Ready Knowledge** is the transformation of unstructured corporate data into governed, deterministic, and securely exposable context packs. It bridges the gap between documents optimized for human readability and datasets optimized for machine action.

We believe that companies must stop writing documentation exclusively for human eyes, and start producing operational, governed context that both humans and autonomous agents can natively consume, audit, and trust.

---

## The 10 Principles of Agent-Ready Knowledge

### 1. Human-Readable First
- **Problem solved:** Pure JSON/XML databases are hostile to human review and authoring.
- **Best practice:** Use standard Markdown as the primary text carrier (e.g., OKF base format).
- **Anti-pattern:** Storing context exclusively in opaque vector databases or proprietary binary formats.
- **Compliance metric:** A non-technical stakeholder can read, understand, and manually edit the raw context file using a basic text editor.

### 2. Machine-Addressable Always
- **Problem solved:** LLMs waste tokens and compute guessing structural metadata from raw text paragraphs.
- **Best practice:** Embed strict YAML frontmatter into every document to explicitly declare types, schemas, and relational IDs.
- **Anti-pattern:** Hiding crucial taxonomy (e.g., "Status: Approved", "Type: Policy") inside free-form text.
- **Compliance metric:** A parser can extract 100% of the document's metadata without invoking an LLM.

### 3. Versioned by Default
- **Problem solved:** Agents hallucinating outdated policies because they read stale wiki pages.
- **Best practice:** Treat knowledge as code. Use strict VCS (Git) to version context packs.
- **Anti-pattern:** Ephemeral wiki platforms where changes are instantaneous and lack structured review branches.
- **Compliance metric:** Every change to the context yields a cryptographic commit hash.

### 4. Provenance-Aware
- **Problem solved:** "Trust propagation" risks where an agent executes a command based on anonymously altered context (Tool Poisoning).
- **Best practice:** Track the origin, author, and timestamp of the context bundle.
- **Anti-pattern:** Blindly aggregating internet scrapes into an agent's memory without source tagging.
- **Compliance metric:** The bundle metadata explicitly declares `lastUpdated`, `author`, and `sourceUrl`.

### 5. Least-Context Principle
- **Problem solved:** "Lost in the middle" hallucinations and massive token costs from stuffing an agent's context window.
- **Best practice:** Expose modular context. Agents request specific chunks via tools (`read_document("id")`) rather than receiving the whole database.
- **Anti-pattern:** Dumping a 100-page PDF into the system prompt.
- **Compliance metric:** Tool execution payloads never exceed the exact boundary of the requested concept.

### 6. Safe-to-Act Boundaries
- **Problem solved:** Agents autonomously executing destructive external actions based on misread internal context.
- **Best practice:** Strict separation of Read vs. Write. Use a Human-In-The-Loop (HITL) approval store for operations that cause external side effects.
- **Anti-pattern:** Giving an agent an API key with global write access and no secondary review gate.
- **Compliance metric:** External write operations are cryptographically blocked pending explicit human token authorization.

### 7. Evaluation-Ready
- **Problem solved:** Unnoticed regressions where an agent suddenly misunderstands a critical policy due to a phrasing change in the context.
- **Best practice:** Treat context updates like code deploys. Run automated evaluations (Evals) against the context to ensure agent comprehension.
- **Anti-pattern:** Updating a standard operating procedure (SOP) without verifying if the agent still passes its synthetic exams.
- **Compliance metric:** CI/CD pipeline blocks context merges if CLEAR metrics (Cost, Latency, Efficacy, Assurance, Reliability) drop below thresholds.

### 8. Protocol-Standardized (MCP-Exposable)
- **Problem solved:** Vendor lock-in and fragmented integrations for exposing data to different AI orchestrators (LangChain, LlamaIndex, custom clients).
- **Best practice:** Expose context securely using the open Model Context Protocol (MCP).
- **Anti-pattern:** Building bespoke REST APIs that require the agent builder to write custom parser logic.
- **Compliance metric:** A standard MCP client can instantly discover and invoke the context via `tools/list` and `resources/list`.

### 9. Model-Independent
- **Problem solved:** Context optimized specifically to trick or format around a single model's tokenizer (e.g., GPT-4 vs. Claude 3.5).
- **Best practice:** Use universal semantic formatting. The knowledge format should be declarative.
- **Anti-pattern:** Embedding model-specific prompt-engineering hacks directly into the knowledge base (e.g., `[INST]`).
- **Compliance metric:** Switching the underlying LLM orchestrator requires zero modifications to the OKF bundle.

### 10. Governance-Friendly
- **Problem solved:** Security and compliance teams blocking agentic AI due to uncontrollable risk surfaces.
- **Best practice:** Design context architecture to natively map to enterprise frameworks like the NIST AI Risk Management Framework (Govern, Map, Measure, Manage).
- **Anti-pattern:** "Shadow AI" instances reading local files without central audit trails.
- **Compliance metric:** Every context access or tool execution generates an OpenTelemetry span with a traceable `requestId` and `autonomyLevel`.

---

## Maturity Matrix

How ready is your organization for autonomous agents? Use this matrix to self-assess.

| Level | Description | Characteristic | Agent Readiness |
|---|---|---|---|
| **Level 0** | **Ad hoc documents** | Scattered PDFs, Docs, and disconnected wikis. | **Hostile.** Agents will hallucinate wildly. |
| **Level 1** | **Structured docs** | Centralized Markdown repositories. | **Poor.** LLMs can read it, but metadata extraction is probabilistic. |
| **Level 2** | **OKF-Style Bundles** | Strict Markdown with YAML frontmatter schemas. | **Good.** Deterministic parsing enables reliable RAG and indexing. |
| **Level 3** | **MCP-Exposed Packs** | Context dynamically exposed via standard JSON-RPC. | **High.** Instant interoperability across multiple agent frameworks. |
| **Level 4** | **Governed AKCP** | HITL approval stores, explicit read/write scopes, OTel auditing. | **Enterprise Ready.** Security and risk teams can audit operations. |
| **Level 5** | **Evaluated Supply Chain** | CI/CD automated evals block regressions in agent comprehension. | **State of the Art.** Autonomous operations scale safely. |

---

## Application Domains

Agent-Ready Knowledge is a horizontal discipline. Here is how it applies across domains:

- **Software Engineering:** Transforming raw codebase documentation into governed `openwiki` context packs so AI coding assistants write architecture-compliant code.
- **Career Management:** Transforming CVs into typed `Skill` and `Experience` profiles so agents can autonomously tailor applications without hallucinating credentials.
- **Customer Support:** Structuring refund and return policies so support agents cannot be prompt-injected into offering unauthorized discounts.
- **IT Operations:** Formatting runbooks into explicit, step-by-step MCP tools with HITL boundaries before an agent can reboot a production server.
- **Compliance/Regulatory:** Keeping regulatory limits in strictly versioned bundles, ensuring that financial agent advisors immediately fail their Evals if they deviate from updated laws.
