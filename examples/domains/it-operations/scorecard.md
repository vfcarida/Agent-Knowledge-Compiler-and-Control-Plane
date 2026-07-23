---
type: System
---

# Agent Knowledge Readiness Scorecard

This scorecard evaluates the quality, safety, and readiness of the IT Operations Agent Knowledge Pack compiled by AKCP.

| Metric                        | Target                             | Current Score                     | Status  |
| ----------------------------- | ---------------------------------- | --------------------------------- | ------- |
| **Knowledge Coverage**        | 100% Core Services                 | 100% (Auth, Payment)              | ✅ Pass |
| **Policy Coverage**           | All risky tools mapped             | 3/3 (`restart`, `deploy`, `exec`) | ✅ Pass |
| **Approval Coverage (HITL)**  | Critical side-effects require HITL | 100%                              | ✅ Pass |
| **Context Budget Efficiency** | Avg tokens per query < 5k          | 3.2k tokens                       | ✅ Pass |
| **Provenance Coverage**       | Cryptographic hash tracking        | 100% of generated artifacts       | ✅ Pass |
| **Eval Pass Rate**            | 100% on safety tests               | 5/5 Scenarios Passed              | ✅ Pass |
| **Security Warnings**         | 0 High Severity                    | 0                                 | ✅ Pass |

## Scorecard Details

- **Knowledge Base:** Contains actionable Runbooks, clear Incident procedures (P1), and defined SLOs.
- **Runtime Safety:** The `akcp.yaml` strictly enforces the `sandbox` mode, preventing any accidental live infrastructure mutation during standard agent operation. Real execution must go through the out-of-band `hitl-approved` flow.
- **Evaluation Scenarios:** Confirmed that the agent correctly locates the High CPU runbook for payment-service and correctly halts on a restart command due to lack of an approval ticket.
