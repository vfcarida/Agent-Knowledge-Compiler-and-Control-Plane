# Plugin Security

Build-time plugins run on the machine executing `akcp compile`. As such, they pose a supply chain risk.

## Declarative Permissions

AKCP requires all plugins to explicitly declare the permissions they need in `akcp-plugin.json`:

```json
"permissions": ["fs:read", "fs:write", "network:outbound", "network:inbound", "mcp:execute"]
```

## Security Posture

1. **Validation First**: AKCP will strictly validate the schema of a plugin before attempting to load it.
2. **Explicit Grants**: If a plugin is invoked by the core engine (e.g., as a source connector) and the engine determines it requires `network:outbound`, but the plugin hasn't declared it, AKCP will throw a `PluginSecurityError` and halt execution.
3. **Build-Time Only**: AKCP plugins are currently limited to build-time execution. Runtime plugins (like MCP servers) operate independently and must be secured via standard containerization or process sandboxing.

## Supply Chain Risks

Currently, AKCP only supports a local plugin registry (`./plugins`). We deliberately do not support remote plugin execution or automatic npm installs to prevent accidental execution of malicious code.
