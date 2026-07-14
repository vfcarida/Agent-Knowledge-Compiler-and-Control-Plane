# How to Contribute a Connector

A **connector** is an AKCP build-time plugin of type `source-connector`. It pulls knowledge from an external system and transforms it into valid OKF Markdown files that can be compiled into AK-IR.

## Step 1: Create the Plugin Directory

Create a new directory in `plugins/`:

```
plugins/
  my-system-connector/
    akcp-plugin.json   ← Manifest
    index.ts           ← Entrypoint (TypeScript)
    README.md          ← Documentation
```

## Step 2: Author the Manifest

```json
{
  "akcpPluginVersion": "1.0.0",
  "name": "my-system-connector",
  "version": "0.1.0",
  "description": "Pulls documents from My System into OKF Markdown.",
  "type": "source-connector",
  "permissions": ["network:outbound", "fs:write"],
  "entrypoint": "index.js",
  "author": "Your Name"
}
```

> **Security Rule:** Only declare the permissions you actually need. The AKCP loader will throw a `PluginSecurityError` if your plugin attempts an action it didn't declare.

## Step 3: Implement the Entrypoint

Your entrypoint must export a class or function that:

1. Accepts configuration (e.g., API URL, credentials via env vars — never hardcoded).
2. Fetches documents from the external source.
3. Returns an array of OKF-compatible Markdown strings.

```typescript
export interface ConnectorConfig {
  apiUrl: string;
  // credentials should come from process.env, never hardcoded
}

export class MySystemConnector {
  constructor(private config: ConnectorConfig) {}

  async fetchDocuments(): Promise<{ filename: string; content: string }[]> {
    // 1. Fetch from the external system
    // 2. Transform to OKF Markdown with valid YAML frontmatter
    // 3. Return the list
    return [
      {
        filename: "my-doc.md",
        content: `---
type: document
title: "My Document"
---
# My Document
Content here.`,
      },
    ];
  }
}
```

## Step 4: Write a README

Your `plugins/my-system-connector/README.md` must include:

- Prerequisites (API keys, environment variables required)
- How to configure the connector in `akcp.yaml`
- Example output

## Step 5: Validate and Submit

```bash
# Validate the manifest is structurally correct
akcp plugin validate ./plugins/my-system-connector

# Run existing tests to confirm no regressions
npx pnpm -r run test -- --run

# Open a PR using the 🔌 New Connector issue template
```

## Security Guidelines

- **Never hardcode credentials.** Use `process.env` for all secrets.
- **Declare all required permissions** in `akcp-plugin.json`.
- **Sanitize inputs.** Treat all data from external systems as untrusted (see OWASP LLM01).
- **Respect rate limits.** Add retry logic with exponential backoff for external APIs.
