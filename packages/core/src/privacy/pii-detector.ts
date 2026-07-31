export interface PiiMatch {
  type: string; // "email", "cpf", "ssn", "phone", "credit_card", etc.
  value: string; // o texto matched
  start: number; // posição no texto
  end: number;
  confidence: "high" | "medium" | "low";
  locale?: string; // "br", "us", etc.
}

export interface PiiDetector {
  detect(text: string): PiiMatch[] | Promise<PiiMatch[]>;
  supportedTypes(): string[];
}

export interface PiiDetectorConfig {
  locales?: string[]; // ["br", "us"] — quais locales ativar
  customPatterns?: PiiPattern[]; // patterns adicionais do usuário
  disabledTypes?: string[]; // tipos a ignorar
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
