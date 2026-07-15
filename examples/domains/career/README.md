# Career Starter Domain

**Maturity Status:** Stable | **Type:** Starter / Educational

The Career domain serves as the primary **starter domain** for understanding the Agent Knowledge Compiler and Control Plane (AKCP). It provides a low-friction, easy-to-understand dataset (a personal career profile, experience, and preferences) to demonstrate how AKCP compiles human-readable knowledge into governed, versioned, testable, and agent-consumable artifacts (MCP resources, context packs, OpenWiki docs).

> **Note:** AKCP is a general-purpose knowledge compiler for organizations (e.g., IT Operations, Customer Support). The Career domain is provided simply because it requires zero organizational context to understand. It is *not* the primary use-case for AKCP.

## Domain Structure

- `sources/`: The raw OKF-compatible source markdown files (Profile, Experience, Preferences).
- `capabilities/`: The MCP tools associated with this domain.
- `policies/`: The policy enforcing that career tools are read-only and require no human approval for low-risk actions.
- `evals/`: The baseline evaluation dataset to test agent accuracy on this domain.
- `expected-output/`: Golden output snapshots from successful compile/serve.
- `akcp.yaml`: The compiler configuration bundle mapping sources to targets.

## Expected Outputs

Once compiled, you can expect:
- A `context-pack.json` (AK-IR) containing the parsed and budgeted OKF documents.
- An `akcp-manifest.json` for MCP resource serving.
- A static HTML OpenWiki in `dist/openwiki`.

## Commands

Follow the steps in [Walkthrough](walkthrough.md), or run these quick commands:

```bash
# 1. Validate the knowledge bundle
pnpm akcp validate --bundle examples/domains/career --profile career

# 2. Compile the bundle into Agent Knowledge IR (AK-IR)
pnpm akcp compile --config examples/domains/career/akcp.yaml

# 3. Serve the bundle as MCP resources
pnpm akcp serve mcp --profile career
```
