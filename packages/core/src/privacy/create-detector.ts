import type { PiiDetector, PiiDetectorConfig } from "./pii-detector.js";
import { RegexPiiDetector } from "./regex-pii-detector.js";

export function createPiiDetector(config?: PiiDetectorConfig): PiiDetector {
  return new RegexPiiDetector(config);
}
