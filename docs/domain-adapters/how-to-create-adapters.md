# How to Create a New Domain Adapter

Creating a custom Domain Adapter allows you to ship AKCP logic to new industries.

## 1. Scaffold the Directory
Create a folder in `examples/domains/<your-domain>`.

## 2. Define the Schema (`schema.ts`)
Define the Zod schemas that validate the `frontmatter` of your OKF documents. Export them so that the CLI and MCP servers can dynamically import and enforce them.

```typescript
import { z } from 'zod';

export const MyEntitySchema = z.object({
  id: z.string(),
  type: z.literal('MyEntity'),
  status: z.string()
});
```

## 3. Create Sample Data (`sample-data/*.okf.md`)
Provide at least one `.okf.md` file that conforms to your schema. This ensures the `pnpm evals` pipeline can successfully parse and test the context boundaries.

## 4. Define Capabilities (`capabilities.json`)
List the MCP tools relevant to this domain. Remember to declare the `riskLevel` and `sideEffectLevel` for proper governance enforcement.

```json
[
  {
    "id": "my.domain.read",
    "name": "read_entity",
    "kind": "tool",
    "version": "1.0.0",
    "riskLevel": "low",
    "sideEffectLevel": "local-read",
    "requiredApproval": false
  }
]
```

## 5. Define Governance Policy (`policy.ts`)
Provide a default `AgentPolicy` tailored to the risks of your domain. If your domain involves heavy writes (like `software-project`), set `autonomyLevel` to `act-with-approval` or strictly list `deniedTools`.
