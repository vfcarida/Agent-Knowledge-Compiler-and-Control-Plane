# AKCP Roadmap

This roadmap outlines the path towards a fully-featured, enterprise-ready Agent Knowledge Compiler and Control Plane.

## ✅ Phase 1: Build-Time Compiler Foundation
- Open Knowledge Format (OKF) parsing and strict Zod validation.
- CLI scaffolding (`agent-ready init`, `validate`, `migrate`).
- Agent Instructions Sync (`agents sync`).

## 🔄 Phase 2: Runtime Control Plane (Current)
- MCP Profile & Automation Servers.
- Capability Registry with strict Side Effect and Risk Level definitions.
- Evals harness to measure tool selection and hallucination rates.
- Operator Dashboard Console (HITL Approval Queues, Audit Logging).

## 🔜 Phase 3: Advanced Governance & Budgeting
- **NIST AI RMF & OWASP Mapping:** Policy Engine runtime interceptors for prompt injection and PII leakage.
- **Context Budgeting:** Safe context compression (Summary vs Full Body) so agents don't get overwhelmed with token bloat.
- **WAF Integration:** Pluggable interfaces for external LLM firewalls (e.g., Lakera, PromptArmor).

## 🔮 Phase 4: Enterprise Scale
- **Authentication:** Implement OAuth 2.0 / Identity flows for remote MCP exposure via Server-Sent Events (SSE).
- **Control Plane Integrations:** Native export to enterprise observability stacks (Datadog, Splunk).
- **ContextOps Hub:** An open-source directory of community-submitted Domain Adapters and Capabilities.
