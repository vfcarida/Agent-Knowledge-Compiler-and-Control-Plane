# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Releases use standard SemVer conventions (e.g. `v0.1.0` or `v0.1.0-alpha.1`) without separate codenames.

For detailed information on our deprecation and backwards compatibility policies, please see the [Release Policy](docs/governance/release-policy.md).

## [Unreleased]

### Added

- **Single-Command Quickstart Experience**: Added `akcp quickstart [directory]` command to bootstrap a knowledge bundle from domain templates (`it-operations`, `career`, `customer-support`), compile IR, emit runtime targets (`AGENTS.md`, `mcp-resources.json`, `policy-bundle.json`, `dashboard-metadata.json`), and boot the Control Plane dashboard with `--open`.
- **Semantic Diff Engine (`akcp diff`)**: Implemented full AST-level semantic diffing between knowledge bundles with breaking change severity classification, JSON, Markdown, and text output formats.
- **Control Plane CLI Suite**: Fully implemented `akcp control-plane inspect`, `policies`, `approvals`, and `audit` commands with JSON output options.
- **Pre-Compiled Dashboard Server**: Standalone Node.js Express BFF server compiled to `dist/server/index.js` with native node runtime spawning and static SPA asset serving via `akcp serve dashboard`.
- **Modernized LLM Evals**: Upgraded `@akcp/evals` default provider to `gpt-4o-mini`, added local zero-cost `OllamaProvider` with `llama3.2` fallback, and dynamic provider factory `createLLMProvider()`.
- **Visual Architecture & Workflow Assets**: Added vector SVG hero diagram (`akcp-workflow.svg`) visualizing knowledge authoring, compiler stages, and runtime control plane.
- **VitePress Documentation Portal**: Complete documentation site with category navigation, API specs, and automated GitHub Pages deployment.
- **PolicyCard Condition Enforcement**: Activated runtime evaluation of `PolicyCard.rules[].condition` in both the policy engine (`policies/adapter.ts`) and standalone evaluator (`policy/evaluate.ts`), supporting `time_window`, `environment`, `approval_exists`, `custom`, and compound conditions. Unknown condition types safely fail closed (deny).
- **Policy Engine Evolution**: Advanced composition, rule conditions, and policy explanation logic (`explainPolicy`).
- **Streamable HTTP Transport**: Added support for chunked HTTP data transfer to overcome SSE limitations.
- **Conformance Suite Levels**: Tiered level validation (basic, standard, strict) optimizing build pipelines vs idempotency checks.
- **Conformance Types**: Added `CheckResult` interface to `@akcp/conformance` resolving TS build errors in check modules.
- **Policy Engine Conflict Resolution**: Strict `UnresolvablePolicyConflictError` thrown on priority-tie conflicts for safe, deterministic halting.
- **Cross-platform Release Script**: Ported `pre-release-check.sh` to a cross-platform Node.js script (`scripts/pre-release-check.js`).

### Changed

- **CLI Commands Fully Activated**: Previously planned commands (`diff`, `serve dashboard`, `control-plane`) and the new `quickstart` command are now fully implemented, functional, and covered by automated test suites.
- **Customer Support Domain Promoted to Beta**: Complete schema conformance, golden compiler snapshots, and runbooks established.
- **[BREAKING] Remote Transport Authentication**: `mcp-profile-server` and `mcp-automation-server` now strictly require authentication when running in remote modes (HTTP/SSE). Anonymous access over remote transports is now blocked by default to prevent unintentional unauthenticated exposure. For local development or testing without auth, you must pass the explicit `--insecure-no-auth` flag. `stdio` transport remains implicitly trusted.
- **Dashboard BFF Security Hardening**: Added strict authentication gates.
- **CLI Modularization**: Restructured internal architecture for independent command loading.
- **Test Quality Improvements**: Elevated total coverage logic, added probatory tests and expanded scenario coverage.
- **Maturity Standardization**: Formalized project maturity model (Stable, Beta, Experimental, Planned, Deprecated).
- **Supply Chain**: SBOM generation (`anchore/sbom-action@v0.24.0`), build provenance attestation (`actions/attest-build-provenance@v4.1.1`), SBOM attestation, and npm `--provenance` publish now implemented in the release workflow.
- **Action Pins**: All GitHub Actions in `release.yml` and `ci.yml` are now pinned to exact commit SHAs.
- **Documentation**: Added `docs/release/release-process.md` with full pre/post-release checklist and `gh attestation verify` instructions. Updated policy engine guide with detailed conflict resolution strategy. Updated CLI reference to reflect `conformance run` Beta status.
- **Supply Chain Docs**: `docs/security/supply-chain.md` updated from roadmap framing to implemented-controls description with consumer verification commands and honest SLSA L1 posture statement.
- **Identity & Naming**: Standardized naming across the repository from OCF to AKCP (Agent Knowledge Compiler and Control Plane) and renamed compiled artifacts to `agent-knowledge-ir.json`.

## [0.1.0] - Initial Enterprise Blueprint Release

### Added

- AKCP Profile v1 schemas mapped over Open Knowledge Format (OKF).
- Model Context Protocol (MCP) servers (`@akcp/mcp-profile-server`, `@akcp/mcp-automation-server`).
- Centralized ApprovalStore via `better-sqlite3` providing time-limited (TTL) token validation.
- CLEAR metrics evaluation engine (`@akcp/evals`).
- OpenTelemetry observability metrics, histograms, and tracing spans for MCP tools.
- CI/CD Workflows for CodeQL, Dependency Review, and Code validation.
- Structured `ToolSuccess<T>` and `ToolFailure` JSON contracts for all MCP tools.
- STRIDE Threat Model and Enterprise Readiness architecture documentation mapping to NIST AI RMF.
