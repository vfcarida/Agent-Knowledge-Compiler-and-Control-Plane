# OpenWiki to AKCP Integration Example

This example demonstrates how to use OpenWiki as an upstream authoring source and AKCP as the downstream compiler.

## The Flow

1. **Import**: Pull markdown from `openwiki/` and normalize it into `.akcp/sources/openwiki/`.
2. **Compile**: AKCP reads the normalized source and compiles it into multiple targets (`dist/`).
3. **Inspect**: Review the cryptographic provenance manifest.
4. **Serve**: Expose the compiled knowledge to agents via MCP.

## Commands to Run

```bash
# 1. Import OpenWiki
pnpm akcp import openwiki --input examples/integrations/openwiki-to-akcp/openwiki --output examples/integrations/openwiki-to-akcp/.akcp/sources/openwiki --force

# 2. Compile to targets
pnpm akcp compile --bundle examples/integrations/openwiki-to-akcp --target all --provenance

# 3. Inspect the Manifest
pnpm akcp inspect-artifact examples/integrations/openwiki-to-akcp/dist/akcp-manifest.json

# 4. Serve via MCP
pnpm akcp serve mcp examples/integrations/openwiki-to-akcp
```
