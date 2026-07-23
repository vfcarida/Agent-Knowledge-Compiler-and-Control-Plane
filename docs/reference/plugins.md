# AKCP Plugin Reference

The Agent Knowledge Compiler and Control Plane (AKCP) supports a declarative build-time plugin architecture.

## Plugin Types

AKCP supports the following plugin types:

- `source-connector`: Pulls knowledge from external systems (e.g., Notion, Jira, Drive).
- `normalizer`: Cleans or transforms knowledge into standard markdown.
- `compile-target`: Pushes the Agent Knowledge IR to a specific platform (e.g., OpenWiki, MCP Profile).
- `policy-pack`: Distributes standardized governance rules.
- `eval-pack`: Distributes benchmark datasets and evaluation scenarios.
- `dashboard-panel`: Extends the local AKCP dashboard UI.

## Creating a Plugin

1. Create a directory (e.g., `my-plugin/`).
2. Add an `akcp-plugin.json` manifest.
3. Write your entrypoint implementation.

### Manifest Schema (`akcp-plugin.json`)

```json
{
  "akcpPluginVersion": "1.0.0",
  "name": "my-plugin",
  "version": "0.1.0",
  "type": "source-connector",
  "permissions": ["fs:read", "network:outbound"],
  "entrypoint": "dist/index.js"
}
```

## Local Registry

By default, AKCP scans for plugins in the `./plugins` directory of your workspace.

```bash
# List all discovered plugins
akcp plugin list

# Validate a specific plugin manifest
akcp plugin validate ./plugins/my-plugin
```
