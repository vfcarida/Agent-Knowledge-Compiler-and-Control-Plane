# Agent Context Profiles (ACP) over OKF

The Open Knowledge Format (OKF) provides a minimal standard for representing organizational knowledge that is both human-readable and akcp. By design, the base OKF spec §4.1 only requires the `type` field in the frontmatter.

To make OKF practically useful for agents across different business domains, this repository introduces **Agent Context Profiles (ACP)**. 

A Profile is a collection of strongly-typed schemas (Zod validators) that enforce the structure of specific `type`s. The orchestrator allows passing `--profile <name>` to enforce domain-specific rigor over your raw OKF files.

## Built-in Profiles

### 1. `career`
Models a professional identity to assist with job search, resume tailoring, and interview prep.
- Types: `Skill`, `Experience`, `Education`, `Certificate`, `Project`, `Preference`, `Application`

### 2. `software-project`
Models the architecture and decisions of a software project. Useful for onboarding agents to a codebase.
- Types: `ArchitectureDecision`, `Service`, `APIEndpoint`, `Runbook`, `CodingConvention`, `Dependency`, `DomainConcept`, `Workflow`

## Creating a Custom Profile

You can extend the orchestrator with your own profiles.
1. Create a new file in `packages/core/src/domain/profiles/my-profile.ts`.
2. Define your OKF documents by extending `OKFFrontmatterSchema`.
3. Create a Discriminated Union schema for the profile.
4. Export the profile and register it in `packages/core/src/domain/schemas.ts` under the `ProfileRegistry`.

```typescript
// Example: my-profile.ts
import { OKFFrontmatterSchema } from '../schemas.js';
import { z } from 'zod';

export const LegalDocumentSchema = OKFFrontmatterSchema.extend({
  type: z.literal('LegalContract'),
  jurisdiction: z.string(),
});

export const LegalProfileSchema = z.discriminatedUnion('type', [
  LegalDocumentSchema
]);
```

## Profile Versioning Strategy

Since profiles define structured metadata, they can evolve. When breaking changes occur:
1. Embed a `profileVersion` field inside the `.okf/index.md` frontmatter (e.g., `profileVersion: 1.2.0`).
2. Have your Agent/CLI read `index.md` first before initializing the Profile Schema.
3. Migrate older `.okf` files using the `@ocf/core` migration tools to adhere to the latest schema definitions.
