---
type: System
---

# IT Operations Flagship Audit

This document tracks the gaps between the baseline state of the IT Operations domain example and the required Enterprise Flagship capabilities as defined in Prompt 05.

| Capability                      | Exists? | Quality | Gap                                                                                                                     | Required change                                                                                      |
| ------------------------------- | ------: | ------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Narrative & Positioning**     |     Yes | Basic   | Needs to position IT Ops as the primary enterprise use case focusing on governance, safety, and operational resilience. | Rewrite `README.md` to include architecture, safety model, metrics, and scenario.                    |
| **Knowledge Base (Services)**   |      No | N/A     | Missing service catalog entries to ground incidents.                                                                    | Create `services/` directory with OKF files defining services (e.g., auth-service, payment-service). |
| **Knowledge Base (Runbooks)**   | Partial | Basic   | Existing data is generic. Needs concrete examples like High CPU, High Memory, Failed Deploy.                            | Create specific runbooks under `runbooks/` representing realistic operational procedures.            |
| **Knowledge Base (Incidents)**  |      No | N/A     | Missing incident procedures (P1/P2) and postmortems.                                                                    | Create `incidents/` directory with P1/P2 resolution procedures.                                      |
| **Knowledge Base (Policies)**   |      No | N/A     | Missing SLOs, Alert configurations, and Ownership docs.                                                                 | Create `policies/` directory with SLO and alert definitions.                                         |
| **Policy Cards (Governance)**   |      No | N/A     | Explicit machine-readable governance (HITL) for risky tools is missing.                                                 | Create `restart_service`, `deploy_service`, `execute_command` policy cards forcing approval.         |
| **AKCP Configuration**          |     Yes | Basic   | Missing wiring for new sources and targets (like eval-dataset and mcp-resources).                                       | Update `akcp.yaml` to specify all knowledge paths, sandbox mode, and correct compile targets.        |
| **Demo Walkthrough**            |      No | N/A     | No step-by-step 15-minute demo script.                                                                                  | Create `WALKTHROUGH.md` with explicit CLI commands.                                                  |
| **Incident Scenario Trace**     |      No | N/A     | Missing a narrative trace of an agent resolving an incident safely.                                                     | Create `scenarios/high-cpu-incident.md` documenting the expected agent workflow.                     |
| **Evaluations (Scorecard)**     |      No | N/A     | Missing automated verification of agent behavior (e.g., rejecting restart without approval).                            | Create `evals/it-operations.yaml` scenarios and `scorecard.md`.                                      |
| **Main Repository Integration** |      No | N/A     | Main README doesn't highlight IT Ops as a flagship.                                                                     | Update root `README.md` to introduce IT Operations.                                                  |
