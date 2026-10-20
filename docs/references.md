# Scientific, Standards, and Executive References

This document catalogs the peer-reviewed literature, industry standards, and enterprise governance frameworks that inform the architecture of the **Agent Knowledge Compiler and Control Plane (AKCP)** and the **Open Knowledge Format (OKF)**.

---

## 1. Scientific & Academic Foundations

1. **Retrieval-Augmented Generation & Grounded Knowledge Systems**
   - Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W.-t., Rocktäschel, T., Riedel, S., & Kiela, D. (2020). _Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks_. Advances in Neural Information Processing Systems (NeurIPS 2020).
   - Edge, D., Trinh, H., Cheng, N., Bradley, J., Chao, A., Mody, A., Truitt, S., & Larson, J. (2024). _From Local to Global: A Graph RAG Approach to Query-Focused Summarization_. Microsoft Research.

2. **Context Window Economics & Information Placement**
   - Liu, N. F., Lin, K., Hewitt, J., Paranjape, A., Bevilacqua, M., Petroni, F., & Liang, P. (2024). _Lost in the Middle: How Language Models Use Long Contexts_. Transactions of the Association for Computational Linguistics (TACL), 12, 157–173.
   - Packer, C., Wooders, S., Lin, K., Fang, V., Patil, S. G., Stoica, I., & Gonzalez, J. E. (2023). _MemGPT: Towards LLMs as Operating Systems_. UC Berkeley.

3. **Reasoning, Tool Use & Agentic Control Loops**
   - Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2023). _ReAct: Synergizing Reasoning and Acting in Language Models_. International Conference on Learning Representations (ICLR 2023).

4. **Indirect Prompt Injection & Adversarial Defense**
   - Greshake, K., Abdelnabi, S., Mishra, S., Endres, C., Holz, T., & Fritz, M. (2023). _Not What You've Signed Up For: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection_. ACM Workshop on Artificial Intelligence and Security (AISec 2023).
   - Wallace, E., Xiao, K., Leike, R., Weng, L., Heidecke, J., & Beutel, A. (2024). _The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions_. OpenAI.

---

## 2. Open Standards, Protocols & Security Taxonomies

1. **Model Context Protocol (MCP)**
   - Anthropic (2024–2025). _Model Context Protocol Specification_. Standardizes JSON-RPC 2.0 capability negotiation, resources (`resources/list`, `resources/read`), prompts (`prompts/list`), and tools (`tools/list`, `tools/call`) across stdio and HTTP transports.

2. **NIST AI Risk Management Framework (AI RMF 1.0)**
   - National Institute of Standards and Technology (2023). _Artificial Intelligence Risk Management Framework (AI RMF 1.0)_, NIST AI 100-1, and _NIST AI 600-1 Generative AI Profile_ (2024). Defines the `GOVERN`, `MAP`, `MEASURE`, and `MANAGE` functions mapped directly into AKCP `PolicyCard` specifications.

3. **OWASP Top 10 for Large Language Model Applications**
   - OWASP Foundation (2025). _OWASP Top 10 for Large Language Model Applications (v2025)_. Specifically informs AKCP controls for `LLM01: Prompt Injection`, `LLM02: Sensitive Information Disclosure`, `LLM05: Improper Output Handling`, and `LLM06: Excessive Agency`.

4. **Supply-Chain Provenance & Software Bill of Materials (SBOM)**
   - SLSA (Supply-chain Levels for Software Artifacts) Specification v1.0 & SPDX (Software Package Data Exchange) ISO/IEC 5962:2021. Inform AKCP's deterministic SHA-256 compilation manifests (`akcp-manifest.json`) and CI SBOM generation.

5. **OpenTelemetry GenAI Semantic Conventions**
   - Cloud Native Computing Foundation (CNCF) OpenTelemetry Project (2024–2025). _Semantic Conventions for Generative AI Systems_. Informs `@akcp/core` tracing spans and metrics counters for compilation stages and MCP tool execution.

---

## 3. Enterprise Governance & Regulatory Frameworks

1. **AI Trust, Risk, and Security Management (AI TRiSM)**
   - Gartner Research (2024–2025). _AI TRiSM Framework_. Establishes runtime policy enforcement, model/agent observability, data protection (PII redaction/tokenization), and human-in-the-loop (HITL) approval gates as mandatory enterprise control-plane primitives.

2. **Agentic AI Governance & Operating Models**
   - McKinsey & Company (2024). _Why Agents Are the Next Frontier of Generative AI_.
   - Boston Consulting Group (BCG) Henderson Institute (2024). _From Potential to Profit with GenAI: Scaling Governed Autonomous Systems_.
   - MIT Sloan Management Review (2024). _Responsible AI and Governance at Scale_.

3. **Regulatory Compliance Baselines**
   - **EU GDPR** (Regulation (EU) 2016/679): Articles 5(1)(c) (Data Minimization), 22 (Automated Individual Decision-Making), and 32 (Security of Processing) — modeled in [`docs/specs/examples/compliance/gdpr-data-privacy.policy.yaml`](./specs/examples/compliance/gdpr-data-privacy.policy.yaml).
   - **US HIPAA** (45 CFR Part 160 and Part 164): Privacy and Security Rules for Protected Health Information (PHI) — modeled in [`docs/specs/examples/compliance/hipaa-phi-protection.policy.yaml`](./specs/examples/compliance/hipaa-phi-protection.policy.yaml).
   - **AICPA SOC 2** Trust Services Criteria (CC6 Logical and Physical Access Controls, CC8 Change Management) — modeled in [`docs/specs/examples/compliance/soc2-change-management.policy.yaml`](./specs/examples/compliance/soc2-change-management.policy.yaml).
