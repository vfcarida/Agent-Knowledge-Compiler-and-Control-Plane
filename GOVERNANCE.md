# AKCP Governance

This document describes the governance model for the **Agent Knowledge Compiler and Control Plane (AKCP)** project, including its normative specifications (OKF format, AK-IR schema, Policy Cards) and reference implementations.

## 1. Governance Philosophy

The AKCP project aims to be an open, transparent, and enterprise-grade standard for agentic knowledge. Our governance model is designed to:

- Ensure the longevity and stability of the specification.
- Encourage community contributions and real-world domain expansions.
- Maintain high security, governance, and HITL (Human-in-the-loop) standards.

## 2. Roles and Responsibilities

### 2.1. BDFL (Benevolent Dictator For Life)

The project is currently led by the BDFL (the original creator), who holds the final say on architectural decisions, standard changes, and major trajectory shifts. The BDFL commits to listening to the community and steering the project towards enterprise maturity.

### 2.2. Core Maintainers

Core Maintainers have push access to the repository and are responsible for:

- Reviewing and merging pull requests.
- Triaging issues and prioritizing the roadmap.
- Enforcing the Code of Conduct.
- Ensuring that no changes compromise the strict threshold and security rules (as per `.agents/AGENTS.md`).

### 2.3. Approvers

Approvers are community members who have demonstrated deep understanding of the AKCP architecture (specifically around MCP gateways and the compilation pipeline). They can approve pull requests but do not have direct merge rights.

### 2.4. Contributors

Anyone who contributes code, documentation, or domain expertise to the project. Contributors are encouraged to join the discussion on RFCs (Request for Comments).

## 3. Decision Making Process (RFC)

For significant changes (e.g., changes to the `CapabilitySchema`, new compiler targets, or security pipeline alterations), we use an RFC (Request for Comments) process:

1. **Draft**: A contributor submits a Markdown file proposing the change in the `docs/rfcs/` directory via a PR.
2. **Review**: The community and Approvers review the RFC for security, backward compatibility, and alignment with enterprise goals (e.g., IT Operations use cases).
3. **Acceptance**: The BDFL or a Core Maintainer accepts the RFC, transitioning its state to "Accepted".
4. **Implementation**: Code is written following the Accepted RFC.

For changes to normative specifications (OKF format, AK-IR schema, Policy Cards), see also [Specification Governance](docs/governance/spec-governance.md) for additional versioning constraints.

## 4. Strict Quality Gates

As mandated by our core rules:

- **Quality Thresholds**: We NEVER lower thresholds; we only raise them.
- **Commit Standards**: Conventional Commits are strictly required. AI/LLM generation must never be credited in commit messages.
- **Security**: The MCP capabilities assume all inputs are hostile. The governance model requires that any new tool or capability added to the repository must include its respective unit tests and validation against injection.

## 5. Amendments

This governance model may be amended via a standard RFC process.
