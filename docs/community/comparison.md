# Comparison Matrix

How does the ContextOps Orchestrator compare to other methods of providing knowledge and capabilities to AI Agents?

## 1. ContextOps vs. OpenWiki
[OpenWiki](https://github.com/langchain-ai/openwiki) is fantastic for quickly dumping unstructured markdown into a folder for an agent to read.
**The Difference:** ContextOps uses the Open Knowledge Format (OKF), which enforces strong YAML schemas (Zod validation). OpenWiki tells the agent "Here is some text." ContextOps tells the agent "This is a strictly validated Architectural Decision Record (ADR) of type X, governed by policy Y."

## 2. ContextOps vs. Pure OKF
The [Google Cloud OKF specification](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing/) defines the markdown file structure.
**The Difference:** OKF is just a file format. ContextOps provides the orchestration: the CLI to validate bundles, the MCP Servers to serve the documents to agents, and the Context Budgeting tools to compress them.

## 3. ContextOps vs. Standalone MCP Servers
You can write an MCP server that just exposes a database or filesystem.
**The Difference:** A raw MCP server exposes operations (`execute_sql`, `write_file`). ContextOps exposes a *Governed Capability Registry*. Before an agent can write, the server enforces Risk Levels, Side Effect declarations, and Human-in-the-Loop approvals for high-risk tools.

## 4. ContextOps vs. RAG Pipelines
Retrieval-Augmented Generation (RAG) chunks documents and retrieves them via vector similarity.
**The Difference:** RAG is probabilistic and prone to context collapse (fetching the wrong chunks). ContextOps is deterministic. Agents request exact `conceptIds` and schemas they know exist via MCP tools, ensuring 100% citation accuracy.

## 5. ContextOps vs. Traditional Knowledge Graphs
Knowledge Graphs use RDF/SPARQL to model relationships.
**The Difference:** Agents (LLMs) are natively trained on Markdown. Converting data to RDF and forcing an LLM to write SPARQL is brittle and token-heavy. ContextOps stores relationships as markdown frontmatter links, which LLMs naturally understand and navigate.

## 6. ContextOps vs. Agent Memory Frameworks
Frameworks like Mem0 or Zep store agent conversational history.
**The Difference:** Memory frameworks manage *episodic* memory (what happened in the chat). ContextOps manages *semantic* memory (the ground-truth facts, policies, and schemas of the enterprise). They are complementary.
