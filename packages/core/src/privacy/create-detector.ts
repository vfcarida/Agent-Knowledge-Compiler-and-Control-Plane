import type { PiiDetector, PiiDetectorConfig } from "./pii-detector.js";
import { RegexPiiDetector } from "./regex-pii-detector.js";
import { NerLiteDetector } from "./ner-lite-detector.js";
import { CompositePiiDetector } from "./composite-detector.js";

export function createPiiDetector(config?: PiiDetectorConfig): PiiDetector {
  const regexDetector = new RegexPiiDetector(config);
  if (!config?.enableNerLite) {
    return regexDetector;
  }
  // Regex first (more precise, structured-format matches win on overlap),
  // then the heuristic name detector to catch free-text PII regex can't.
  return new CompositePiiDetector([regexDetector, new NerLiteDetector()]);
}
