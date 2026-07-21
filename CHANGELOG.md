# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Releases use standard SemVer conventions (e.g. `v0.1.0` or `v0.1.0-alpha.1`) without separate codenames.

For detailed information on our deprecation and backwards compatibility policies, please see the [Release Policy](docs/governance/release-policy.md).

## [Unreleased]

### Changed

- **Maturity Standardization**: Formalized project maturity model (Stable, Beta, Experimental, Planned, Deprecated).
- **Placeholder Commands**: CLI commands that are not fully implemented (`diff`, `serve dashboard`, `control-plane`) now throw explicit `NOT_IMPLEMENTED` errors instead of returning misleading success statuses.
- **Supply Chain**: SBOM generation (`anchore/sbom-action@v0.24.0`), build provenance attestation (`actions/attest-build-provenance@v4.1.1`), SBOM attestation, and npm `--provenance` publish now implemented in the release workflow.
- **Action Pins**: All GitHub Actions in `release.yml` and `ci.yml` are now pinned to exact commit SHAs.
- **Documentation**: Added `docs/release/release-process.md` with full pre/post-release checklist and `gh attestation verify` instructions.
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
