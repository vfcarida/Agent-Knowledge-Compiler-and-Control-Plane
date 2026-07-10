# Enterprise Readiness Model

This document maps the Agent Knowledge Compiler and Control Plane to the **NIST AI Risk Management Framework (AI RMF)**, providing a baseline for enterprise governance.

## NIST AI RMF Core Mapping

| Area | Current | Required for Enterprise | Gap | Control |
|---|---|---|---|---|
| **Data (Govern/Map)** | OKF bundle, local storage | Strict data classification, RBAC, Data Lifecycle Management | Partial | Data policies, Enterprise IAM integration |
| **Agents (Govern/Map)** | MCP servers (Profile, Automation) | Granular Autonomy Levels, verifiable trust | Partial | Policy Engine hardening, Agent registration |
| **Security (Map/Manage)** | Basic Sandbox, STRIDE | Threat model, Pen-testing, adversarial simulations | Partial | Continuous OWASP mapping + MCP Security guidelines |
| **Observability (Measure)** | OTel metrics + spans | Distributed tracing (Jaeger/X-Ray), SLOs | Partial | Full OpenTelemetry backend ingestion |
| **Governance (Govern)** | Local HITL policies | Risk Register, Enterprise compliance reviews | Partial | NIST AI RMF continuous audits |

## Risk Register

| Risk ID | Description | Likelihood | Impact | Mitigation Strategy | Owner |
|---|---|---|---|---|---|
| **RSK-001** | Unauthorized side effect execution by LLM | Low | High | Enforce single-use token HITL approvals via `confirm_application_submission`. | AppSec |
| **RSK-002** | Prompt injection via malicious tool descriptor | Medium | High | Contract tests locking tool output to structured `ToolSuccess<T>`. | AI Eng |
| **RSK-003** | PII leak in agent context | Medium | High | Run LLM locally (e.g. Gemma 4) or strict DLP redaction pipeline. | Privacy |
| **RSK-004** | Brittle browser automation failures | High | Medium | Rely heavily on APIs where possible; use Playwright sandbox fallbacks. | QA |

## Data Classification
In the OCF Career domain, data is classified as:
- **Confidential/PII**: `preferences`, `experiences` containing sensitive contact info.
- **Internal**: `applications` statuses.
- **Public**: `skills`, `projects` intended for public visibility.
