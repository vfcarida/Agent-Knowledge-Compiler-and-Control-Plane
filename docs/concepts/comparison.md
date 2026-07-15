# How AKCP Compares

AKCP occupies a unique position in the AI agent ecosystem. This page clarifies what AKCP does and does not do, relative to common alternatives.

## Positioning

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Agent Ecosystem                            │
│                                                                 │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐  │
│  │ Agent       │   │ Knowledge    │   │ Knowledge           │  │
│  │ Frameworks  │   │ Retrieval    │   │ Governance          │  │
│  │             │   │              │   │                     │  │
│  │ LangGraph   │   │ RAG          │   │ ★ AKCP ★           │  │
│  │ AutoGen     │   │ Vector DBs   │   │                     │  │
│  │ CrewAI      │   │ Embeddings   │   │ Compile + Control   │  │
│  └─────────────┘   └──────────────┘   └─────────────────────┘  │
│        ▲                   ▲                    ▲                │
│        │                   │                    │                │
│   Orchestrates        Retrieves           Governs & Compiles    │
│   agent logic         at runtime          at build time         │
└─────────────────────────────────────────────────────────────────┘
```

## Feature Comparison

| Capability                             | AKCP                    | RAG Pipeline            | LangGraph | MCP (raw) |
| -------------------------------------- | ----------------------- | ----------------------- | --------- | --------- |
| **Knowledge compilation** (build-time) | Yes                     | No                      | No        | No        |
| **Deterministic grounding**            | Yes                     | Partial (probabilistic) | No        | No        |
| **Policy governance**                  | Yes (Policy Cards)      | No                      | No        | No        |
| **Human-in-the-loop**                  | Yes (crypto tokens)     | No                      | Manual    | No        |
| **Audit trail**                        | Yes (per-action)        | No                      | No        | No        |
| **Agent orchestration**                | No                      | No                      | Yes       | No        |
| **Semantic search**                    | No (delegates)          | Yes                     | No        | No        |
| **Tool protocol**                      | MCP (wraps)             | N/A                     | Custom    | Yes       |
| **Multi-agent coordination**           | No                      | No                      | Yes       | No        |
| **PII protection**                     | Yes (build + runtime)   | No                      | No        | No        |
| **Versioned artifacts**                | Yes (IR + manifests)    | No                      | No        | No        |
| **Conformance testing**                | Yes                     | No                      | No        | No        |
| **Cost/budget control**                | Yes (context economics) | No                      | No        | No        |

## When to use AKCP

Use AKCP when you need:

- **Governed knowledge delivery** to agents (not just "throw docs at a vector DB")
- **Deterministic, testable** context for agents operating in sensitive environments
- **Policy enforcement** before agent side-effects (deploy, submit, remediate)
- **Audit evidence** for compliance (NIST AI RMF, SOC2)
- **Build-time compilation** that catches errors before runtime

## When NOT to use AKCP

Do not use AKCP if you need:

- **Agent orchestration** (multi-step reasoning, tool chains) → Use LangGraph/AutoGen
- **Semantic similarity search** over millions of documents → Use a vector DB + RAG
- **Real-time knowledge updates** (sub-second freshness) → Use streaming pipelines
- **LLM fine-tuning** or model training → Use training frameworks

## Complementary usage

AKCP is designed to work WITH other tools:

```
[Your Knowledge Sources]
│
▼
┌─────────┐
│  AKCP   │ ← Compiles & Governs
│ Compiler│
└────┬────┘
│
▼
┌───────────────┐     ┌──────────────┐
│ MCP Resources │────▶│  Your Agent  │ (LangGraph, AutoGen, custom)
│ (governed)    │     │  Framework   │
└───────────────┘     └──────────────┘
│
▼
┌─────────┐
│  AKCP   │ ← Controls runtime execution
│ Gateway │
└─────────┘
```

## FAQ

**Q: Can I use AKCP with my existing RAG pipeline?**
A: Yes. AKCP compiles knowledge into artifacts that can be indexed in a vector DB. The difference is that AKCP ensures the knowledge is validated, governed, and versioned before indexing.

**Q: Does AKCP replace MCP?**
A: No. AKCP uses MCP as its transport protocol. It adds governance (policies, approvals, audit) on top of raw MCP.

**Q: Is AKCP an agent framework?**
A: No. AKCP provides the deterministic context and governed capabilities that agents consume. It does not orchestrate agent logic.
