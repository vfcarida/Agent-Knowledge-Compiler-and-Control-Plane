import type { AgentKnowledgeIR, IRConcept } from "../ir/types.js";

export interface ContradictionConceptInput {
  conceptId: string;
  body?: string;
  markdownContent?: string;
  status?: "active" | "stale" | "deprecated" | "archived";
  lifecycleStatus?: "active" | "stale" | "deprecated" | "archived" | string;
}

export type ContradictionKind =
  "POLARITY_CONFLICT" | "NUMERIC_SLA_CONFLICT" | "STALE_OVERRIDE_CONFLICT";

export interface KnowledgeContradiction {
  id: string;
  kind: ContradictionKind;
  severity: "error" | "warning";
  conceptA: string;
  conceptB: string;
  subjectKey: string;
  statementA: string;
  statementB: string;
  explanation: string;
}

export interface ContradictionAnalysisReport {
  totalConceptsAnalyzed: number;
  contradictionsFound: number;
  hasCriticalContradictions: boolean;
  contradictions: KnowledgeContradiction[];
}

interface NormativeClaim {
  conceptId: string;
  polarity: "positive" | "negative";
  subjectKey: string;
  rawLine: string;
}

interface NumericConstraint {
  conceptId: string;
  metricKey: string;
  valueWithUnit: string;
  rawLine: string;
}

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "all",
  "any",
  "be",
]);

function normalizeSubjectPhrase(phrase: string): string {
  const tokens = phrase
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
  return tokens.slice(0, 4).join(" ");
}

function getConceptText(concept: ContradictionConceptInput): string {
  return concept.body ?? concept.markdownContent ?? "";
}

function getConceptStatus(concept: ContradictionConceptInput): string {
  return concept.status ?? concept.lifecycleStatus ?? "active";
}

function extractNormativeClaims(
  concept: ContradictionConceptInput,
): NormativeClaim[] {
  const claims: NormativeClaim[] = [];
  const lines = getConceptText(concept).split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Negative polarity check first (so MUST NOT is not matched as MUST)
    const negMatch = line.match(
      /\b(?:NEVER|MUST\s+NOT|SHALL\s+NOT|DO\s+NOT|FORBIDDEN\s+TO)\s+([a-zA-Z0-9_\-\s]{4,60})/i,
    );
    if (negMatch && negMatch[1]) {
      const subjectKey = normalizeSubjectPhrase(negMatch[1]);
      if (subjectKey.length >= 3) {
        claims.push({
          conceptId: concept.conceptId,
          polarity: "negative",
          subjectKey,
          rawLine: line,
        });
      }
      continue;
    }

    const posMatch = line.match(
      /\b(?:MUST|ALWAYS|REQUIRED\s+TO|SHALL)\s+([a-zA-Z0-9_\-\s]{4,60})/i,
    );
    if (posMatch && posMatch[1]) {
      const subjectKey = normalizeSubjectPhrase(posMatch[1]);
      if (subjectKey.length >= 3) {
        claims.push({
          conceptId: concept.conceptId,
          polarity: "positive",
          subjectKey,
          rawLine: line,
        });
      }
    }
  }

  return claims;
}

function extractNumericConstraints(
  concept: ContradictionConceptInput,
): NumericConstraint[] {
  const constraints: NumericConstraint[] = [];
  const lines = getConceptText(concept).split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(
      /\b([a-zA-Z][a-zA-Z0-9_-]{2,28})\s*(?::|=|\bis\b)\s*(\d+(?:\.\d+)?)\s*(ms|s|sec|seconds|m|min|minutes|h|hours|%|mb|gb)\b/i,
    );
    if (match && match[1] && match[2] && match[3]) {
      const metricKey = match[1].toLowerCase().trim();
      const valueWithUnit = `${match[2]}${match[3].toLowerCase()}`;
      constraints.push({
        conceptId: concept.conceptId,
        metricKey,
        valueWithUnit,
        rawLine: line,
      });
    }
  }

  return constraints;
}

/**
 * Analyzes an AgentKnowledgeIR or array of IRConcept/ContradictionConceptInput items to detect epistemic
 * contradictions: opposing normative rules (MUST vs NEVER), conflicting numeric
 * SLAs/timeouts, and active concepts depending on deprecated/archived concepts.
 */
export function detectKnowledgeContradictions(
  input: AgentKnowledgeIR | IRConcept[] | ContradictionConceptInput[],
): ContradictionAnalysisReport {
  const concepts: ContradictionConceptInput[] = Array.isArray(input)
    ? input
    : (input.concepts ?? []);
  const links = Array.isArray(input) ? [] : (input.links ?? []);
  const contradictions: KnowledgeContradiction[] = [];
  const seenIds = new Set<string>();

  const allClaims: NormativeClaim[] = [];
  const allConstraints: NumericConstraint[] = [];

  for (const concept of concepts) {
    allClaims.push(...extractNormativeClaims(concept));
    allConstraints.push(...extractNumericConstraints(concept));
  }

  // 1. Detect Polarity Conflicts (MUST <subject> vs NEVER/MUST NOT <subject>)
  for (let i = 0; i < allClaims.length; i++) {
    const claimA = allClaims[i]!;
    for (let j = i + 1; j < allClaims.length; j++) {
      const claimB = allClaims[j]!;
      if (
        claimA.subjectKey === claimB.subjectKey &&
        claimA.polarity !== claimB.polarity
      ) {
        const pairKey = [claimA.conceptId, claimB.conceptId].sort().join("::");
        const id = `POLARITY::${pairKey}::${claimA.subjectKey}`;
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        contradictions.push({
          id,
          kind: "POLARITY_CONFLICT",
          severity: "error",
          conceptA: claimA.conceptId,
          conceptB: claimB.conceptId,
          subjectKey: claimA.subjectKey,
          statementA: claimA.rawLine,
          statementB: claimB.rawLine,
          explanation: `Opposing normative modality on '${claimA.subjectKey}': '${claimA.conceptId}' asserts ${claimA.polarity.toUpperCase()} while '${claimB.conceptId}' asserts ${claimB.polarity.toUpperCase()}.`,
        });
      }
    }
  }

  // 2. Detect Numeric SLA / Parameter Conflicts
  for (let i = 0; i < allConstraints.length; i++) {
    const cA = allConstraints[i]!;
    for (let j = i + 1; j < allConstraints.length; j++) {
      const cB = allConstraints[j]!;
      if (
        cA.conceptId !== cB.conceptId &&
        cA.metricKey === cB.metricKey &&
        cA.valueWithUnit !== cB.valueWithUnit
      ) {
        const pairKey = [cA.conceptId, cB.conceptId].sort().join("::");
        const id = `NUMERIC::${pairKey}::${cA.metricKey}`;
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        contradictions.push({
          id,
          kind: "NUMERIC_SLA_CONFLICT",
          severity: "warning",
          conceptA: cA.conceptId,
          conceptB: cB.conceptId,
          subjectKey: cA.metricKey,
          statementA: cA.rawLine,
          statementB: cB.rawLine,
          explanation: `Conflicting numeric SLA/parameter for '${cA.metricKey}': '${cA.conceptId}' specifies '${cA.valueWithUnit}' whereas '${cB.conceptId}' specifies '${cB.valueWithUnit}'.`,
        });
      }
    }
  }

  // 3. Detect Stale/Deprecated Override Conflicts along Graph Edges
  const conceptMap = new Map<string, ContradictionConceptInput>(
    concepts.map((c) => [c.conceptId, c]),
  );
  for (const link of links) {
    const src = conceptMap.get(link.sourceConceptId);
    const tgt = conceptMap.get(link.targetConceptId);
    if (!src || !tgt) continue;

    const srcStatus = getConceptStatus(src);
    const tgtStatus = getConceptStatus(tgt);

    if (
      srcStatus === "active" &&
      (tgtStatus === "deprecated" || tgtStatus === "archived")
    ) {
      const id = `STALE::${src.conceptId}::${tgt.conceptId}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      contradictions.push({
        id,
        kind: "STALE_OVERRIDE_CONFLICT",
        severity: "warning",
        conceptA: src.conceptId,
        conceptB: tgt.conceptId,
        subjectKey: `${src.conceptId}->${tgt.conceptId}`,
        statementA: `${src.conceptId} (status: ${srcStatus})`,
        statementB: `${tgt.conceptId} (status: ${tgtStatus})`,
        explanation: `Active concept '${src.conceptId}' depends on ${tgtStatus} concept '${tgt.conceptId}', risking epistemic drift.`,
      });
    }
  }

  return {
    totalConceptsAnalyzed: concepts.length,
    contradictionsFound: contradictions.length,
    hasCriticalContradictions: contradictions.some(
      (c) => c.severity === "error",
    ),
    contradictions,
  };
}
