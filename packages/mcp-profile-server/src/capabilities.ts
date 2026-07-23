import type { CapabilityManifest } from "@akcp/core";

export const profileServerCapabilities: CapabilityManifest[] = [
  {
    id: "akcp.profile.list_documents",
    name: "list_documents",
    kind: "tool",
    version: "1.0.0",
    description:
      "Lists all available documents in the Context Pack. When to use: To discover what knowledge exists. When not to use: If you already know the document ID. Side effects: none (local-read). Returns an array of basic document metadata.",
    riskLevel: "low",
    sideEffectLevel: "local-read",
    requiredApproval: false,
  },
  {
    id: "akcp.profile.read_document",
    name: "read_document",
    kind: "tool",
    version: "1.0.0",
    description:
      "Reads a document. Accepts optional pagination parameters `offset`, `limit` and `summaryOnly`. When to use: To inspect specific knowledge. When not to use: Without a known conceptId. Side effects: none (local-read). Returns the OKFDocument.",
    riskLevel: "low",
    sideEffectLevel: "local-read",
    requiredApproval: false,
  },
  {
    id: "akcp.profile.create_document",
    name: "create_document",
    kind: "tool",
    version: "1.0.0",
    description:
      'Creates a new document in the Context Pack. When to use: To persist new knowledge. When not to use: If you just need temporary scratchpad. Side effects: Mutates filesystem (local-write). Example: `create_document({ conceptId: "new-adr", body: "..." })`.',
    riskLevel: "medium",
    sideEffectLevel: "local-write",
    requiredApproval: true,
  },
  {
    id: "akcp.profile.update_document",
    name: "update_document",
    kind: "tool",
    version: "1.0.0",
    description:
      'Updates an existing document in the Context Pack. When to use: To refine or fix existing knowledge. When not to use: Without knowing the exact conceptId. Side effects: Mutates filesystem (local-write). Example: `update_document({ conceptId: "old-adr", bodyUpdate: "..." })`.',
    riskLevel: "medium",
    sideEffectLevel: "local-write",
    requiredApproval: true,
  },
  {
    id: "akcp.profile.delete_document",
    name: "delete_document",
    kind: "tool",
    version: "1.0.0",
    description:
      'Deletes a document from the Context Pack. When to use: To remove deprecated knowledge. When not to use: For temporary hiding. Side effects: Destructive filesystem operation (local-write). Example: `delete_document({ conceptId: "deprecated-adr" })`.',
    riskLevel: "high",
    sideEffectLevel: "local-write",
    requiredApproval: true,
  },
  {
    id: "akcp.profile.validate_bundle",
    name: "validate_bundle",
    kind: "tool",
    version: "1.0.0",
    description:
      "Validates the structural integrity of the entire Context Pack. When to use: After bulk modifications or initialization. When not to use: After minor localized edits. Side effects: none (local-read). Returns diagnostics.",
    riskLevel: "low",
    sideEffectLevel: "local-read",
    requiredApproval: false,
  },
  {
    id: "akcp.profile.migrate_bundle",
    name: "migrate_bundle",
    kind: "tool",
    version: "1.0.0",
    description:
      "Migrates the Context Pack to the latest schema version. When to use: If validation fails due to version mismatch. When not to use: Routinely. Side effects: Mass local filesystem updates (local-write). Example: `migrate_bundle({ write: true })`.",
    riskLevel: "high",
    sideEffectLevel: "local-write",
    requiredApproval: true,
  },
  {
    id: "akcp.profile.rebuild_indexes",
    name: "rebuild_indexes",
    kind: "tool",
    version: "1.0.0",
    description:
      "Rebuilds index.md files for progressive disclosure. When to use: After adding/removing documents manually or via tools. When not to use: If no documents were created/deleted. Side effects: Overwrites index files (local-write). Example: `rebuild_indexes()`.",
    riskLevel: "medium",
    sideEffectLevel: "local-write",
    requiredApproval: true,
  },
  {
    id: "akcp.profile.build_context_pack",
    name: "build_context_pack",
    kind: "tool",
    version: "1.0.0",
    description:
      "Selects and compresses documents to fit within a given token budget. When to use: To summarize knowledge efficiently for another agent. When not to use: If the whole bundle fits easily. Side effects: none (local-read).",
    riskLevel: "low",
    sideEffectLevel: "local-read",
    requiredApproval: false,
  },
];
