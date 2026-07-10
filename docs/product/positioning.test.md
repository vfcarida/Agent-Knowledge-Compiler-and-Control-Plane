# Positioning Documentary Checklist

This checklist ensures that all documentation within the AKCP repository adheres to the category thesis. Run this verification periodically.

## 1. Category Alignment
- [ ] **No "Reference Architecture" framing:** The repository is positioned as the "Agent Knowledge Compiler and Control Plane (AKCP)".
- [ ] **Separation of Planes:** Documentation clearly distinguishes between the "Build-Time Compiler" (CLI, validation, packing) and the "Runtime Control Plane" (MCP Servers, HITL, Dashboard).

## 2. Competitive Differentiation
- [ ] **OpenWiki:** Acknowledged as an upstream authoring tool. AKCP is positioned downstream as the compiler and runtime.
- [ ] **OKF/MCP:** Described as underlying specifications and transport layers, NOT as the product itself.
- [ ] **RAG:** AKCP is positioned as deterministic and strictly-typed, contrasting with probabilistic RAG.

## 3. Evidence-Based Claims
- [ ] **"Enterprise-grade":** Not used loosely. Claims of security must cite the OWASP/NIST `PolicyEngine` implementation.
- [ ] **Context Budget:** Claims of context compression must point to the `maxLength` and `summaryOnly` properties in the `read_document` MCP tool.
- [ ] **Safety:** Claims of safety must reference the HITL SQLite Approval Queue and `riskLevel` capability constraints.

## 4. Vertical Independence
- [ ] **Career Domain:** "Career" is strictly referred to as a "Reference Domain" or "Vertical Demo". It is not the core product.
- [ ] **Other Domains:** IT Operations and Software Project examples are maintained to prove model-independence.
