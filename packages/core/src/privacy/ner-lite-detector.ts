import type { PiiDetector, PiiMatch } from "./pii-detector.js";

/**
 * Heuristic, dependency-free approximation of named-entity-recognition for
 * person names — NOT production-grade NER. RegexPiiDetector only matches
 * structured formats (emails, SSNs, card numbers, ...); it has no way to catch
 * free-text names, which is exactly the gap the industry-standard approach
 * (Microsoft Presidio: regex/checksum recognizers + a real NER model) closes
 * with a trained model. A real transformer-based NER model (spaCy, Presidio's
 * default pipeline) is impractical to add here — it needs a Python runtime or
 * a large WASM/ONNX model bundle, neither of which this package currently has
 * as a dependency, and it can't be installed/verified in this sandbox anyway.
 *
 * What follows is a plain-JS heuristic instead: honorific-prefixed names and
 * multi-word Title Case sequences, filtered against a small stopword list to
 * cut obvious false positives (sentence-initial capitals, month names, common
 * capitalized English words). It WILL both miss real names and flag some
 * false positives — always at "low"/"medium" confidence, never "high", so
 * callers relying on `confidence === "high"` (see MCPGateway.containsPII) are
 * unaffected by this detector's imprecision. Treat this as a stopgap; swapping
 * in Presidio or spaCy-based NER is the documented real upgrade path (see
 * docs/security/pii-redaction.md).
 */
export class NerLiteDetector implements PiiDetector {
  private static readonly HONORIFICS = [
    "Mr",
    "Mrs",
    "Ms",
    "Miss",
    "Dr",
    "Prof",
    "Sr",
    "Jr",
    "Sra",
    "Srta",
  ];

  // Common capitalized words that would otherwise look like the start of a
  // Title Case name sequence — sentence-initial words, months, days, and a
  // handful of frequent false-positive nouns.
  private static readonly STOPWORDS = new Set([
    "The",
    "This",
    "That",
    "These",
    "Those",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]);

  private readonly honorificPattern: RegExp;
  private readonly titleCasePattern: RegExp;

  constructor() {
    const honorifics = NerLiteDetector.HONORIFICS.join("|");
    this.honorificPattern = new RegExp(
      `\\b(?:${honorifics})\\.?\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+){0,2})`,
      "g",
    );
    // Two or three consecutive Title Case words (e.g. "John Smith", "Maria Da Silva").
    this.titleCasePattern = new RegExp(
      `\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z]+){1,2})\\b`,
      "g",
    );
  }

  detect(text: string): PiiMatch[] {
    const matches: PiiMatch[] = [];
    const claimedSpans: Array<[number, number]> = [];

    let m: RegExpExecArray | null;

    const honorificRegex = new RegExp(this.honorificPattern.source, "g");
    while ((m = honorificRegex.exec(text)) !== null) {
      const full = m[0];
      const start = m.index;
      const end = start + full.length;
      matches.push({
        type: "person_name",
        value: full,
        start,
        end,
        confidence: "medium",
      });
      claimedSpans.push([start, end]);
    }

    const titleCaseRegex = new RegExp(this.titleCasePattern.source, "g");
    while ((m = titleCaseRegex.exec(text)) !== null) {
      const value = m[1] ?? m[0];
      const firstWord = value.split(/\s+/)[0] ?? "";
      if (NerLiteDetector.STOPWORDS.has(firstWord)) continue;

      const start = text.indexOf(value, m.index);
      const end = start + value.length;
      const overlapsHonorificMatch = claimedSpans.some(
        ([cs, ce]) => start < ce && end > cs,
      );
      if (overlapsHonorificMatch) continue;

      matches.push({
        type: "person_name",
        value,
        start,
        end,
        confidence: "low",
      });
    }

    return matches;
  }

  supportedTypes(): string[] {
    return ["person_name"];
  }
}
