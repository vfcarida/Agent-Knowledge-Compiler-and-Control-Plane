export interface PiiMatch {
  type: string; // "email", "cpf", "ssn", "phone", "credit_card", etc.
  value: string; // The matched substring
  start: number; // Start index in the source text
  end: number;
  confidence: "high" | "medium" | "low";
  locale?: string; // "br", "us", etc.
}

export interface PiiDetector {
  detect(text: string): PiiMatch[] | Promise<PiiMatch[]>;
  supportedTypes(): string[];
}

export interface PiiDetectorConfig {
  locales?: string[]; // ["br", "us"] — which locales to activate
  customPatterns?: PiiPattern[]; // Additional custom user patterns
  disabledTypes?: string[]; // PII types to ignore
  /**
   * Compose the regex detector with a heuristic (dependency-free) person-name
   * detector — see ner-lite-detector.ts. Off by default: it's best-effort and
   * can add both false positives and new match types callers weren't
   * expecting, so it's opt-in rather than silently changing existing behavior.
   */
  enableNerLite?: boolean;
}

export interface PiiPattern {
  type: string;
  regex: RegExp;
  confidence: "high" | "medium" | "low";
  locale?: string;
}
