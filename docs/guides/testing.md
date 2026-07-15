# AKCP Testing Strategy

Agent Knowledge Compiler and Control Plane (AKCP) requires a robust, multi-layered testing strategy to prove its safety, usefulness, and interoperability. Unit tests alone are insufficient for agent infrastructure.

## Test Taxonomy

Our testing taxonomy is layered to catch issues at the appropriate abstraction boundaries.

| Layer | Purpose | Execution |
|---|---|---|
| **Unit tests** | Validate pure functions, state machines, and small modules (e.g. schemas, hash utilities). | pnpm test:unit |
| **Integration tests** | Validate multiple modules working together (e.g. Compiler loading real files). | pnpm test:integration |
| **Contract tests** | Validate that our API schemas, MCP descriptors, and output manifests remain stable and conformant to OKF specs. | pnpm test:contract |
| **Security tests** | Validate policy enforcement, PII redaction, Human-in-the-Loop gating, and prompt injection mitigations. | pnpm test:security |
| **Conformance tests** | Validates generated Context Packs and capabilities against the strict AKCP standard rules. | pnpm test:conformance |
| **E2E tests** | Validates the dashboard and flagship walkthroughs using Playwright. | pnpm test:e2e |
| **Evals / Benchmarks** | Evaluates agent-relevant behavior, context efficiency, latency, and hallucination regression. | pnpm evals |
| **Golden tests** | Validates deterministic compiled outputs of the AKCP compiler against known good snapshots. | Run as part of integration/unit tests. |

## Test Coverage Matrix

As of the current release, here is the approximate coverage matrix across our critical capabilities:

| Capability | Unit | Integration | Contract | Security | E2E | Evals | Gap |
|---|---:|---:|---:|---:|---:|---:|---|
| **OKF Parsing** | High | Med | N/A | Low | N/A | N/A | Need malformed inputs |
| **Context Economics** | Med | Low | N/A | N/A | Low | Low | Needs E2E validation |
| **Policy Evaluation** | Med | Low | N/A | High | N/A | N/A | Needs integration |
| **PII Redaction** | High | Low | N/A | High | N/A | N/A | Needs integration |
| **Tool Routing** | Low | Med | High | High | Low | Low | Needs evals |
| **CLI Operations** | Med | Med | N/A | N/A | N/A | N/A | Needs golden tests |

## Standardized Commands

The repository orchestrates tests via standard scripts. If a package does not implement a layer, its script should safely no-op (e.g., \echo 'no tests'\).

- pnpm test: Runs all standard unit and integration suites.
- pnpm test:unit: Explicit unit tests.
- pnpm test:integration: Explicit integration tests.
- pnpm test:contract: Tests MCP compatibility and schema stability.
- pnpm test:security: Tests HITL, Policy, and Privacy features.
- pnpm test:e2e: Runs Playwright E2E suites.
- pnpm test:conformance: Runs the AKCP validation suite.
- pnpm test:coverage: Generates a Vitest v8 coverage report.
- pnpm quality:gate: Runs the combined release-blocking suite (`test`, `test:coverage`, `test:contract`, `test:security`, `test:conformance`).
- pnpm evals: Generates the benchmark-report.md (Not part of the quality gate).

## Coverage Thresholds and Quality Gates

AKCP enforces strict coverage thresholds across the monorepo to ensure quality regression does not occur. These thresholds are defined in the `vitest.config.ts` files of each package and at the monorepo root.

- **`@akcp/core`**: 80% minimum coverage.
- **`@akcp/cli`, `@akcp/mcp-profile-server`, `@akcp/mcp-automation-server`, `@akcp/conformance`**: Target minimums (e.g. 50-60%) set initially, incrementing over time.

The **Quality Gate** (`pnpm quality:gate`) acts as a single point of failure in our CI pipeline. If coverage drops below the threshold, or any security, conformance, or contract test fails, the CI build will fail.

> [!NOTE]
> Evals are inherently non-deterministic due to LLM variability and thus are decoupled from the strict `quality:gate`. They are executed separately via `pnpm evals`. E2E tests are also separate to avoid requiring a browser environment in all standard validation runs.

## Evals Design Principles

1. **Deterministic Config:** Evals must support offline, deterministic modes for default CI pipelines.
2. **Provider Isolation:** LLM provider specifics must be abstracted behind our control plane wrappers.

