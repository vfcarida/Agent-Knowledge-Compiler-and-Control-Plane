# Walkthrough: Career Domain

This guide demonstrates how to compile personal knowledge (a career profile) into an Agent Knowledge Context Pack (AK-IR) and serve it as MCP capabilities.

## 1. Validate the knowledge bundle
Verify that the `sources/` directory contains correctly formatted OKF documents:
```bash
pnpm akcp validate --bundle examples/domains/career --profile career
```
*Expected Output: Bundle is marked as valid.*

## 2. Compile into Agent Knowledge IR
Transform the raw OKF documents into semantic artifacts (AK-IR, OpenWiki) defined in `akcp.yaml`.
```bash
pnpm akcp compile --config examples/domains/career/akcp.yaml
```
*Expected Output: A `dist/` directory is created with `context-pack.json` and a static OpenWiki.*

## 3. Serve via MCP
Run the Model Context Protocol server to expose the compiled knowledge to your local agent.
```bash
pnpm akcp serve mcp --profile career
```
*Expected Output: The server runs and exposes tools defined in `capabilities/capabilities.json` governed by `policies/career.policy.yaml`.*
