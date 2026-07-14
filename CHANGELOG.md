# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

For detailed information on our deprecation and backwards compatibility policies, please see the [Release Policy](docs/governance/release-policy.md).

## [Unreleased]

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
