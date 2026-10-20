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

4. **Indirect Prompt Injection, Selective Abstention & Epistemic Calibration**
   - Greshake, K., Abdelnabi, S., Mishra, S., Endres, C., Holz, T., & Fritz, M. (2023). _Not What You've Signed Up For: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection_. ACM Workshop on Artificial Intelligence and Security (AISec 2023).
   - Wallace, E., Xiao, K., Leike, R., Weng, L., Heidecke, J., & Beutel, A. (2024). _The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions_. OpenAI.
   - Kamath, A., Jia, R., & Liang, P. (2020). _Selective Question Answering under Domain Shift_. Annual Meeting of the Association for Computational Linguistics (ACL 2020).
   - Kadavath, S., Conerly, T., Askell, A., Henighan, T., Drain, D., Perez, E., Schiefer, N., Hatfield-Dodds, Z., DasSarma, N., Tran-Johnson, E., Johnston, S., El-Showk, S., Jones, A., Elhage, N., Hume, T., Chen, A., Bai, Y., Bowman, S., Fort, S., Ganguli, D., Hernandez, D., Jacobson, J., Kernion, J., Kravec, S., Lovitt, L., Ndousse, K., Olsson, C., Ringer, S., Amodei, D., Brown, T., Clark, J., Joseph, N., Mann, B., McCandlish, S., Olah, C., & Kaplan, J. (2022). _Language Models (Mostly) Know What They Know_. Anthropic.

5. **Hybrid Information Retrieval, Graph Ranking & Distributed State**
   - Robertson, S., & Zaragoza, H. (2009). _The Probabilistic Relevance Framework: BM25 and Beyond_. Foundations and Trends in Information Retrieval, 3(4), 333–389.
   - Cormack, G. V., Clarke, C. L. A., & Buettcher, S. (2009). _Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods_. ACM SIGIR Conference on Research and Development in Information Retrieval (SIGIR 2009).
   - Haveliwala, T. H. (2002). _Topic-Sensitive PageRank_. International Conference on World Wide Web (WWW 2002).
   - Birgisson, A., Politz, J. G., Erlingsson, Ú., Taly, A., Vrable, M., & Lentczner, M. (2014). _Macaroons: Cookies with Contextual Caveats for Decentralized Authorization in the Cloud_. Network and Distributed System Security Symposium (NDSS 2014), Google Research.
   - Shapiro, M., Preguiça, N., Baquero, C., & Zawirski, M. (2011). _Conflict-Free Replicated Data Types_. International Symposium on Stabilization, Safety, and Security of Distributed Systems (SSS 2011).

---

## 2. Open Standards, Protocols & Security Taxonomies

1. **Model Context Protocol (MCP)**
   - Anthropic (2024–2025). _Model Context Protocol Specification_. Standardizes JSON-RPC 2.0 capability negotiation, resources (`resources/list`, `resources/read`), prompts (`prompts/list`), and tools (`tools/list`, `tools/call`) across stdio and HTTP transports.

2. **NIST AI Risk Management Framework (AI RMF 1.0)**
   - National Institute of Standards and Technology (2023). _Artificial Intelligence Risk Management Framework (AI RMF 1.0)_, NIST AI 100-1, and _NIST AI 600-1 Generative AI Profile_ (2024). Defines the `GOVERN`, `MAP`, `MEASURE`, and `MANAGE` functions mapped directly into AKCP `PolicyCard` specifications.

3. **OWASP Top 10 for Large Language Model Applications & Agentic Security**
   - OWASP Foundation (2025–2026). _OWASP Top 10 for Large Language Model Applications_ and _OWASP Agentic AI Top 10_. Specifically informs AKCP controls for `LLM01: Prompt Injection`, `LLM02: Sensitive Information Disclosure`, `LLM05: Improper Output Handling`, and `LLM06 / LLM08: Excessive Agency`.

4. **Supply-Chain Provenance (in-toto / SLSA) & Knowledge Bill of Materials (CycloneDX v1.5)**
   - Torres-Arias, S., Afzali, H., Kuppusamy, T. K., Curtmola, R., & Cappos, J. (2019). _in-toto: Providing Farm-to-Table Guarantees for Bits and Bytes_. USENIX Security Symposium (USENIX Security 2019).
   - OWASP CycloneDX Standard v1.5 & SLSA (Supply-chain Levels for Software Artifacts) Specification v1.0. Inform AKCP's deterministic SHA-256 compilation manifests (`akcp-manifest.json`), Ed25519 in-toto ITE-6 attestations, and `sbom-cyclonedx` (`sbom.cdx.json`) target emission.

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
