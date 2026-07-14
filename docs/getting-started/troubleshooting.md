# Troubleshooting

## `pnpm install` fails

Ensure you are using `pnpm` version 10+ and Node.js 22+.

```bash
corepack enable
pnpm --version
```

## MCP Client cannot connect

Check if the server is running on stdio. If you are using Claude Desktop, ensure the config explicitly points to `node /path/to/dist/index.js`.

## Automation fails with "Execution Blocked"

This is expected. The automation server defaults to `sandbox` mode. To run live automations, you must explicitly opt-in:

```bash
export AUTOMATION_RUNTIME_MODE=explicit-authorized-live
```
