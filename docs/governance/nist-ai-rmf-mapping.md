# NIST AI RMF Mapping

AKCP implements the NIST AI Risk Management Framework (AI RMF) through architectural constraints.

## 1. Govern

- **Control:** Agent policies (`AgentPolicy`) are codified in TypeScript and version-controlled.
- **Implementation:** Predefined enterprise and sandbox policies explicitly map who owns the risk of an agent's execution.

## 2. Map

- **Control:** The Capability Registry.
- **Implementation:** Every MCP tool explicitly maps its scope, risk level (`low`, `medium`, `high`, `critical`), and side-effect boundaries.

## 3. Measure

- **Control:** Context Budget and Evals.
- **Implementation:** The `pnpm evals` pipeline mathematically measures Context Utilization, Unsafe Action Rate, and Latency against baseline models.

## 4. Manage

- **Control:** Autonomy Levels & PII Redaction.
- **Implementation:** The MCP server dynamically blocks dangerous operations in `observe` mode, and the Context Packer redacts PII before it reaches the LLM context window.
