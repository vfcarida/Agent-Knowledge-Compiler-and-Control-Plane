import type { OkfCompletionItem } from "./completion.js";

export interface IndexedConcept {
  conceptId: string;
  title: string;
  type: string;
  sensitivity: string;
  status: string;
  ttlDays: number;
  estimatedTokens: number;
  outgoingLinks: string[];
  filePath: string;
}

export interface WorkspaceConceptIndex {
  concepts: Map<string, IndexedConcept>;
  impactMap: Record<string, string[]>;
}

function slugifyBasename(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const base = normalized.split("/").pop() ?? "document";
  const withoutExt = base.replace(/\.(okf|md|markdown)$/i, "");
  return withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseConceptFromMarkdown(
  content: string,
  filePath: string,
): IndexedConcept {
  const lines = content.split(/\r?\n/);
  const fm: Record<string, string> = {};
  let bodyStartLine = 0;

  if (lines[0]?.trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === "---") {
        bodyStartLine = i + 1;
        break;
      }
      const match = (lines[i] ?? "").match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
      if (match && match[1]) {
        fm[match[1]] = (match[2] ?? "").trim().replace(/^["']|["']$/g, "");
      }
    }
  }

  const body = lines.slice(bodyStartLine).join("\n");
  const conceptId = fm.id || slugifyBasename(filePath);
  const title = fm.title || fm.name || conceptId;
  const type = fm.type || "Concept";
  const sensitivity = fm.sensitivity || fm.visibility || "internal";
  const status = fm.status || "active";
  const ttlDays = Number(fm.ttlDays || fm.freshnessTtlDays || 90) || 90;
  const estimatedTokens = Math.max(
    1,
    Math.ceil(Buffer.byteLength(body, "utf8") / 4),
  );

  const outgoingSet = new Set<string>();
  const wikiMatches = body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
  for (const m of wikiMatches) {
    if (m[1]) {
      outgoingSet.add(m[1].trim());
    }
  }

  return {
    conceptId,
    title,
    type,
    sensitivity,
    status,
    ttlDays,
    estimatedTokens,
    outgoingLinks: Array.from(outgoingSet).sort(),
    filePath,
  };
}

export function buildWorkspaceConceptIndex(
  documents: Array<{ filePath: string; content: string }>,
): WorkspaceConceptIndex {
  const concepts = new Map<string, IndexedConcept>();
  const reverseAdj = new Map<string, Set<string>>();

  for (const doc of documents) {
    const parsed = parseConceptFromMarkdown(doc.content, doc.filePath);
    concepts.set(parsed.conceptId, parsed);
    if (!reverseAdj.has(parsed.conceptId)) {
      reverseAdj.set(parsed.conceptId, new Set());
    }
  }

  for (const concept of concepts.values()) {
    for (const targetId of concept.outgoingLinks) {
      if (targetId === concept.conceptId) continue;
      if (!reverseAdj.has(targetId)) {
        reverseAdj.set(targetId, new Set());
      }
      reverseAdj.get(targetId)!.add(concept.conceptId);
    }
  }

  // Compute transitive downstream blast radius (BFS on reverse edges)
  const impactMap: Record<string, string[]> = {};
  for (const conceptId of concepts.keys()) {
    const visited = new Set<string>();
    const queue = Array.from(reverseAdj.get(conceptId) ?? []);
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === conceptId || visited.has(curr)) continue;
      visited.add(curr);
      const nextDependents = reverseAdj.get(curr);
      if (nextDependents) {
        for (const dep of nextDependents) {
          if (!visited.has(dep)) {
            queue.push(dep);
          }
        }
      }
    }
    impactMap[conceptId] = Array.from(visited).sort();
  }

  return { concepts, impactMap };
}

/**
 * Returns WikiLink completion items when the line prefix ends with `[[` or `[[partial`.
 */
export function getWikiLinkCompletions(
  linePrefix: string,
  index: WorkspaceConceptIndex,
): OkfCompletionItem[] {
  const match = linePrefix.match(/\[\[([a-zA-Z0-9_:-]*)$/);
  if (!match) return [];

  const partial = (match[1] ?? "").toLowerCase();
  const items: OkfCompletionItem[] = [];

  for (const concept of index.concepts.values()) {
    if (
      partial.length === 0 ||
      concept.conceptId.toLowerCase().includes(partial) ||
      concept.title.toLowerCase().includes(partial)
    ) {
      const blastCount = (index.impactMap[concept.conceptId] ?? []).length;
      items.push({
        label: concept.conceptId,
        detail: `${concept.title} (${concept.type} | ${concept.sensitivity} | ~${concept.estimatedTokens} tokens | blast radius: ${blastCount})`,
        insertText: `${concept.conceptId}]]`,
      });
    }
  }

  return items.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Builds rich Markdown hover documentation for a concept ID showing its metadata,
 * token budget, lifecycle status, and downstream blast radius.
 */
export function getConceptHoverMarkdown(
  conceptId: string,
  index: WorkspaceConceptIndex,
): string | null {
  const cleanId = (
    conceptId.replace(/^\[\[|\]\]$/g, "").split("|")[0] ?? ""
  ).trim();
  const concept = index.concepts.get(cleanId);
  if (!concept) return null;

  const impacted = index.impactMap[cleanId] ?? [];
  const impactText =
    impacted.length > 0
      ? `${impacted.length} concept(s) (${impacted.join(", ")})`
      : "0 downstream dependents (leaf node)";

  return [
    `### AKCP Concept: \`${concept.conceptId}\``,
    `**Title**: ${concept.title}`,
    `**Type**: \`${concept.type}\` | **Sensitivity**: \`${concept.sensitivity}\` | **Status**: \`${concept.status}\``,
    `**Context Budget**: ~${concept.estimatedTokens} tokens | **Freshness TTL**: ${concept.ttlDays}d`,
    `**Downstream Blast Radius**: ${impactText}`,
  ].join("\n\n");
}

/**
 * Builds the top-of-document CodeLens summary string for an OKF Markdown document.
 */
export function getDocumentCodeLensSummary(
  content: string,
  filePath: string,
  index: WorkspaceConceptIndex,
): string {
  const parsed = parseConceptFromMarkdown(content, filePath);
  const impacted = index.impactMap[parsed.conceptId] ?? [];
  return `AKCP: ~${parsed.estimatedTokens} tokens | Type: ${parsed.type} | Sensitivity: ${parsed.sensitivity} | Blast Radius: ${impacted.length} downstream`;
}
