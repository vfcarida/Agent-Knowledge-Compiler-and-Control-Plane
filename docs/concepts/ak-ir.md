# Agent Knowledge Intermediate Representation (IR)

The **Agent Knowledge IR** is a deterministic, JSON-serializable structure that acts as the build-time output of the Agent Knowledge Compiler. It transforms human-authored Open Knowledge Format (OKF) markdown bundles into a strict, unified representation that the Control Plane (MCP Servers and Policies) can safely consume.

## Why an IR?

While OKF is excellent for humans (Markdown + YAML), runtime agents need pre-computed structural data:

- **Capabilities & Policies:** Linking documents to specific tools and access rules.
- **Budgets:** Pre-calculating character/token counts to enforce context window limits.
- **Provenance:** Tracking exactly which file generated which concept and its last modified state.
- **Link Resolution:** Understanding graph dependencies between concepts without re-parsing markdown on the fly.

## Structure Overview

An IR output typically contains:

```json
{
  "irVersion": "1.0.0",
  "okfVersion": "0.1.0",
  "bundleId": "career-bundle",
  "buildId": "bld_123abc",
  "timestamp": "2026-07-08T00:00:00Z",
  "concepts": [
    {
      "conceptId": "skill-typescript",
      "type": "Skill",
      "source": {
        "filePath": "skills/typescript.md",
        "format": "okf/markdown"
      },
      "frontmatter": {
        "type": "Skill",
        "name": "TypeScript",
        "level": "Expert"
      },
      "body": "Detailed content...",
      "budget": {
        "byteSize": 1200,
        "estimatedTokens": 300
      }
    }
  ],
  "links": [
    {
      "sourceConceptId": "app-google",
      "targetConceptId": "skill-typescript",
      "relationType": "requires"
    }
  ],
  "policies": {
    "defaultAutonomyLevel": "advise",
    "piiHandling": "redact"
  },
  "capabilities": [],
  "targets": ["mcp-profile-server", "mcp-automation-server"]
}
```

## Preservation of Unknown Fields

To adhere to the OKF v0.1 spec, the compiler **must** preserve any unknown frontmatter keys. The IR encapsulates this within the `frontmatter` object, ensuring no downstream metadata is lost during the compilation process.

## IR vs OKF

- **OKF:** The source code (Markdown + YAML).
- **IR:** The compiled binary (JSON). Used to feed the Control Plane.
