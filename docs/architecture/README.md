# Architecture Diagrams

This page collects the key architectural diagrams for the **Agent Knowledge Compiler and Control Plane (AKCP)**. Each diagram is maintained as Mermaid source and rendered natively on GitHub.

---

## 1. Compiler Pipeline

The AKCP compiler transforms raw, human-authored knowledge into deterministic, agent-consumable artifacts through a structured pipeline.

```mermaid
flowchart TD
    subgraph Sources["📂 Knowledge Sources"]
        S1[Markdown Files]
        S2[Wikis & Runbooks]
        S3[CRM / Ticketing]
        S4[Code Repos]
    end

    subgraph Ingest["🔌 Ingestion Layer"]
        C1[OKF Directory Connector]
        C2[OpenWiki Connector]
        C3[Custom Connectors]
    end

    subgraph Compile["⚙️ Compiler Pipeline"]
        P1["1. Parse OKF Frontmatter"]
        P2["2. Normalize → AK-IR"]
        P3["3. Validate IR"]
        P4["4. Link Entities (Graph)"]
        P5["5. Attach Provenance"]
        P6["6. Optimize Context Budget"]
        P7["7. Emit Compile Targets"]
        P8["8. Write Artifact Manifest"]
        P9["9. Run Conformance Checks"]
    end

    subgraph Targets["📦 Compiled Artifacts"]
        T1[MCP Resource Manifest]
        T2[Context Pack]
        T3[OpenWiki Docs]
        T4[Agent Instructions]
        T5[Eval Dataset]
    end

    Sources --> Ingest
    Ingest --> P1
    P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7
    P7 --> T1 & T2 & T3 & T4 & T5
    P7 --> P8 --> P9
```

---

## 2. Control Plane Runtime

The Control Plane governs how agents interact with compiled artifacts at runtime.

```mermaid
flowchart LR
    Agent["🤖 AI Agent"]

    subgraph MCP["MCP Layer"]
        PS[Profile Server\nread-only resources]
        AS[Automation Server\nside-effect tools]
    end

    subgraph CP["⚙️ Control Plane"]
        CR[Capability Registry]
        PC[Policy Cards]
        AP[Approval Store\nHTTP-HITL]
        ES[Evidence Store\nImmutable Audit Log]
    end

    subgraph Artifacts["📦 Compiled Artifacts"]
        CP2[Context Packs]
        MM[MCP Resource Manifests]
    end

    Agent -->|"list_resources\nread_resource"| PS
    Agent -->|"call_tool"| AS
    PS & AS -->|"capability check"| CR
    CR -->|"policy lookup"| PC
    AS -->|"high-risk action"| AP
    AP -->|"HITL approval required"| HumanOp["👤 Human Operator"]
    HumanOp -->|"grant token"| AP
    AP -->|"approved"| AS
    AS & PS -->|"emit telemetry"| ES
    Artifacts --> PS
```

---

## 3. MCP Integration

How AKCP wraps the Model Context Protocol with governance controls.

```mermaid
flowchart TD
    subgraph Agent["🤖 Agent Runtime"]
        A1[LLM / Agent Framework]
    end

    subgraph AKCP_MCP["AKCP MCP Servers"]
        PS["@akcp/mcp-profile-server\n(read-only resources & prompts)"]
        AU["@akcp/mcp-automation-server\n(side-effect tools)"]
    end

    subgraph Controls["Governance Controls"]
        RL[Risk Level\nDeclaration]
        SE[Side-Effect\nClassification]
        BU[Context Budget\nEnforcement]
        AT[OpenTelemetry\nAudit Spans]
    end

    A1 -->|"MCP Protocol"| PS
    A1 -->|"MCP Protocol"| AU
    PS --> RL & BU & AT
    AU --> RL & SE & AT
    SE -->|"requiresApproval=true"| HITL["👤 HITL Approval"]
    HITL -->|"approved token"| AU
```

---

## 4. Domain Adapter Lifecycle

How organizational knowledge flows from raw source systems into compiled AKCP artifacts.

```mermaid
flowchart TD
    Raw["📄 Raw Knowledge\n(docs, tickets, runbooks, wikis)"]

    subgraph Adapter["Domain Adapter"]
        DA1[Source Connector]
        DA2[OKF Mapper\nfrontmatter + body]
        DA3[Domain Schema\nValidation]
    end

    subgraph Bundle["OKF Bundle"]
        BF[Markdown Files\n+ YAML Frontmatter]
        BC[akcp.yaml\nBuild Config]
        BCaps[capabilities.json\nCapability Registry]
    end

    subgraph Output["Compiled Output"]
        IR[AK-IR JSON]
        CP[Context Pack]
        MCP2[MCP Manifest]
        EV[Eval Dataset]
    end

    Raw --> DA1 --> DA2 --> DA3
    DA3 --> BF & BC & BCaps
    BF & BC & BCaps -->|"akcp compile"| IR
    IR --> CP & MCP2 & EV
```

---

## 5. Supply Chain & Release Evidence

How AKCP ensures end-to-end artifact traceability and supply chain integrity.

```mermaid
flowchart LR
    subgraph Source["Source Code"]
        SC[Git Commit\n+ Tag]
        GH[GitHub Actions\nCI/CD]
    end

    subgraph Build["Build Artifacts"]
        BIN[npm Package\nor CLI Binary]
        SBOM[SBOM\nSoftware Bill of Materials]
        PROV[SLSA Provenance\nAttestation]
    end

    subgraph Verify["Verification"]
        SIG[Sigstore\nArtifact Signature]
        SC2[OpenSSF\nScorecard]
        REV[Security Review\nChecklist]
    end

    subgraph Runtime["Runtime Artifacts"]
        AKR[AK-IR Build State\n.akcp/cache/build-state.json]
        MAN[Artifact Manifest\nprovenance.json]
    end

    SC --> GH
    GH --> BIN & SBOM & PROV
    PROV --> SIG
    GH --> SC2 & REV
    BIN --> AKR --> MAN
```

---

## Related Docs

- [Compiler Pipeline Concepts](../concepts/compiler.md)
- [Control Plane Concepts](../concepts/control-plane.md)
- [MCP Security](../security/mcp-security.md)
- [Supply Chain Security](../security/supply-chain.md)
- [Domain Adapter Guide](../guides/create-domain-adapter.md)
