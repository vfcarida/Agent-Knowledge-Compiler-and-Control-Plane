import type { CostTracker } from "../capabilities/cost-tracker.js";

export interface SemanticCompressionResult {
  compressedContent: string;
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  preservedHeadings: number;
  preservedInvariants: number;
  preservedLinks: string[];
}

export interface AdaptiveCandidateDocument {
  id: string;
  title: string;
  content: string;
  relevanceScore: number;
}

export interface AdaptivePackedItem {
  id: string;
  title: string;
  content: string;
  mode: "full" | "compressed";
  tokensUsed: number;
  originalTokens: number;
}

export interface AdaptivePackReport {
  effectiveBudgetTokens: number;
  usedTokens: number;
  packedItems: AdaptivePackedItem[];
  droppedIds: string[];
}

function estimateMarkdownTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

const INVARIANT_PATTERN =
  /\b(MUST|NEVER|REQUIRED|CRITICAL|DENY|APPROVAL|FORBIDDEN|SHALL NOT)\b/i;
const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

/**
 * Compresses a Markdown knowledge document into a high-signal semantic digest
 * that fits within `targetMaxTokens`, preserving headings, normative governance
 * invariants (MUST/NEVER/REQUIRED), and [[WikiLinks]].
 */
export function compressDocumentSemantically(
  content: string,
  targetMaxTokens: number,
): SemanticCompressionResult {
  const originalTokens = estimateMarkdownTokens(content);
  const linksSet = new Set<string>();
  for (const m of content.matchAll(WIKILINK_REGEX)) {
    if (m[1]) {
      linksSet.add(m[1].trim());
    }
  }

  if (originalTokens <= targetMaxTokens) {
    return {
      compressedContent: content,
      originalTokens,
      compressedTokens: originalTokens,
      compressionRatio: 1,
      preservedHeadings: (content.match(/^#{1,6}\s+/gm) ?? []).length,
      preservedInvariants: content
        .split("\n")
        .filter((l) => INVARIANT_PATTERN.test(l)).length,
      preservedLinks: [...linksSet],
    };
  }

  const lines = content.split(/\r?\n/);
  const headings: string[] = [];
  const invariantLines: string[] = [];
  const linkLines: string[] = [];
  const summaryLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^#{1,6}\s+/.test(line)) {
      headings.push(line);
    } else if (INVARIANT_PATTERN.test(line)) {
      invariantLines.push(line);
    } else if (line.includes("[[") && line.includes("]]")) {
      linkLines.push(line);
    } else if (summaryLines.length < 4 && line.length > 20) {
      summaryLines.push(line);
    }
  }

  const assembled: string[] = [];
  let currentTokens = 0;
  let preservedHeadings = 0;
  let preservedInvariants = 0;

  const tryPush = (
    line: string,
    kind: "heading" | "invariant" | "other",
  ): boolean => {
    const cost = estimateMarkdownTokens(line + "\n");
    if (currentTokens + cost > targetMaxTokens && assembled.length > 0) {
      return false;
    }
    assembled.push(line);
    currentTokens += cost;
    if (kind === "heading") preservedHeadings++;
    if (kind === "invariant") preservedInvariants++;
    return true;
  };

  for (const h of headings) {
    if (!tryPush(h, "heading")) break;
  }
  for (const inv of invariantLines) {
    if (!tryPush(inv, "invariant")) break;
  }
  for (const lnk of linkLines) {
    if (!tryPush(lnk, "other")) break;
  }
  for (const sum of summaryLines) {
    if (!tryPush(sum, "other")) break;
  }

  const compressedContent = assembled.join("\n");
  const compressedTokens = estimateMarkdownTokens(compressedContent);

  return {
    compressedContent,
    originalTokens,
    compressedTokens,
    compressionRatio:
      originalTokens > 0
        ? Number((compressedTokens / originalTokens).toFixed(4))
        : 1,
    preservedHeadings,
    preservedInvariants,
    preservedLinks: [...linksSet],
  };
}

/**
 * Packs candidate documents into an adaptive context window governed by both
 * a base token budget and an optional FinOps `CostTracker` per-agent remaining allowance.
 * Documents that exceed remaining full capacity are semantically compressed instead of dropped.
 */
export function packWithAdaptiveBudget(
  candidates: AdaptiveCandidateDocument[],
  options: {
    baseBudgetTokens: number;
    agentId?: string;
    costTracker?: CostTracker;
    minGuaranteedTokens?: number;
    minCompressedItemTokens?: number;
  },
): AdaptivePackReport {
  let effectiveBudgetTokens = options.baseBudgetTokens;

  if (options.costTracker && options.agentId) {
    const agentBudget = options.costTracker.getBudget(options.agentId);
    const agentUsage = options.costTracker.getUsage(options.agentId);
    if (agentBudget !== undefined) {
      const consumed = agentUsage?.cumulativeTokens ?? 0;
      const remaining = Math.max(
        options.minGuaranteedTokens ?? 120,
        agentBudget - consumed,
      );
      effectiveBudgetTokens = Math.min(options.baseBudgetTokens, remaining);
    }
  }

  const sorted = [...candidates].sort(
    (a, b) => b.relevanceScore - a.relevanceScore,
  );
  const packedItems: AdaptivePackedItem[] = [];
  const droppedIds: string[] = [];
  let usedTokens = 0;
  const minCompressed = options.minCompressedItemTokens ?? 30;

  for (const doc of sorted) {
    const fullTokens = estimateMarkdownTokens(doc.content);
    const remaining = effectiveBudgetTokens - usedTokens;

    if (fullTokens <= remaining) {
      packedItems.push({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        mode: "full",
        tokensUsed: fullTokens,
        originalTokens: fullTokens,
      });
      usedTokens += fullTokens;
    } else if (remaining >= minCompressed) {
      const compressed = compressDocumentSemantically(doc.content, remaining);
      if (
        compressed.compressedTokens > 0 &&
        compressed.compressedTokens <= remaining
      ) {
        packedItems.push({
          id: doc.id,
          title: doc.title,
          content: compressed.compressedContent,
          mode: "compressed",
          tokensUsed: compressed.compressedTokens,
          originalTokens: fullTokens,
        });
        usedTokens += compressed.compressedTokens;
      } else {
        droppedIds.push(doc.id);
      }
    } else {
      droppedIds.push(doc.id);
    }
  }

  return {
    effectiveBudgetTokens,
    usedTokens,
    packedItems,
    droppedIds,
  };
}
