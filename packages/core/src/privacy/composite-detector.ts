import type { PiiDetector, PiiMatch } from "./pii-detector.js";

/**
 * Runs multiple detectors and merges their findings, dropping any later match
 * that overlaps a span already claimed by an earlier (higher-priority) one —
 * detectors should be passed in priority order (most precise first).
 */
export class CompositePiiDetector implements PiiDetector {
  constructor(private readonly detectors: PiiDetector[]) {}

  async detect(text: string): Promise<PiiMatch[]> {
    const merged: PiiMatch[] = [];

    for (const detector of this.detectors) {
      const found = await detector.detect(text);
      for (const match of found) {
        const overlaps = merged.some(
          (m) => match.start < m.end && match.end > m.start,
        );
        if (!overlaps) merged.push(match);
      }
    }

    return merged.sort((a, b) => a.start - b.start);
  }

  supportedTypes(): string[] {
    return [...new Set(this.detectors.flatMap((d) => d.supportedTypes()))];
  }
}
