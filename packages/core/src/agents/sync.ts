export interface SyncAgentInstructionsOptions {
  projectPurpose?: string;
  architectureBoundaries?: string;
  contextSources?: string;
  commandsToRun?: string;
  forbiddenActions?: string;
  docsToConsult?: string;
  testingRequirements?: string;
  securityRequirements?: string;
  commitConventions?: string;
}

const START_MARKER = "<!-- akcp:start -->";
const END_MARKER = "<!-- akcp:end -->";

const DEFAULT_OPTIONS: SyncAgentInstructionsOptions = {
  projectPurpose:
    "AKCP Orchestrator - Managing AI Agent Knowledge via Agent Knowledge Compiler and Control Plane (AKCP) (OKF) and Context Packs.",
  architectureBoundaries:
    "Use TypeScript, ESM, Node.js. Avoid external dependencies unless justified.",
  contextSources:
    "Always consult the `.agent-context/` directory or use MCP Profile Server tools (`list_documents`, `read_document`) before answering questions.",
  commandsToRun:
    "Run `npx akcp validate` to check OKF bundles. Run `pnpm test` for unit tests.",
  forbiddenActions:
    "Do NOT bypass MCP capabilities. Do NOT commit destructive changes without user approval.",
  docsToConsult:
    "Reference OKF Specification, MCP Architecture, NIST AI RMF, and OWASP LLM Top 10.",
  testingRequirements:
    "Write tests proportionate to the risk level. Run Vitest before declaring success.",
  securityRequirements:
    "Assume MCP tool inputs are hostile. Follow Least Privilege.",
  commitConventions:
    "Use Conventional Commits (e.g. `feat: `, `fix: `). Never credit AI in commit messages.",
};

export function syncAgentInstructions(
  existingContent: string,
  options?: Partial<SyncAgentInstructionsOptions>,
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const generatedBlock = `${START_MARKER}
> **⚠️ MANAGED CONTEXT BLOCK ⚠️**
> The contents of this block are automatically synchronized by \`akcp agents sync\`.
> Do not edit this block manually. Place custom instructions outside these markers.

## 1. Project Purpose
${opts.projectPurpose}

## 2. Architecture Boundaries
${opts.architectureBoundaries}

## 3. Context Sources
${opts.contextSources}

## 4. Commands to Run
${opts.commandsToRun}

## 5. Forbidden Actions
${opts.forbiddenActions}

## 6. Docs to Consult
${opts.docsToConsult}

## 7. Testing Requirements
${opts.testingRequirements}

## 8. Security Requirements
${opts.securityRequirements}

## 9. Commit / PR Conventions
${opts.commitConventions}

${END_MARKER}`;

  if (!existingContent || existingContent.trim() === "") {
    return generatedBlock + "\n";
  }

  const startIndex = existingContent.indexOf(START_MARKER);
  const endIndex = existingContent.indexOf(END_MARKER);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    // Replace existing block
    const before = existingContent.substring(0, startIndex);
    const after = existingContent.substring(endIndex + END_MARKER.length);
    return before + generatedBlock + after;
  }

  // If markers don't exist but file does, append to the top
  return generatedBlock + "\n\n" + existingContent;
}
