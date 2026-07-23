# Troubleshooting

## `pnpm install` fails

Ensure you are using `pnpm` version 10+ and Node.js >= 20.0.0.

```bash
corepack enable
pnpm --version
```

## `akcp: command not found`

If you try to run `akcp validate` directly and it fails, it's because the CLI is not installed globally. 
Always prefix commands with `pnpm` (e.g., `pnpm akcp validate`) to run the locally built workspace binary.

## Validation fails with `invalid_type` or `invalid_union_discriminator`

This means your markdown frontmatter does not strictly match the expected Zod schema for the domain profile you are compiling. 
Check `packages/core/src/domain/profiles/` for the exact schema requirements for your domain (e.g., ensuring `type` is set correctly).

## MCP Client cannot connect

Check if the server is running on stdio. If you are using Claude Desktop, ensure the config explicitly points to `node /path/to/dist/index.js`.

## Automation fails with "Execution Blocked"

This is expected. The automation server defaults to `sandbox` mode. To run live automations, you must explicitly opt-in:

```bash
export AUTOMATION_RUNTIME_MODE=explicit-authorized-live
```
