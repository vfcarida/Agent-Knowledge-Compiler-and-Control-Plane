export interface PiiMatch {
  type: string;       // "email", "cpf", "ssn", "phone", "credit_card", etc.
  value: string;      // o texto matched
  start: number;      // posição no texto
  end: number;
  confidence: "high" | "medium" | "low";
  locale?: string;    // "br", "us", etc.
}

export interface PiiDetector {
  // eslint-disable-next-line no-unused-vars
  detect(text: string): PiiMatch[] | Promise<PiiMatch[]>;
  supportedTypes(): string[];
}

export interface PiiDetectorConfig {
  locales?: string[];           // ["br", "us"] — quais locales ativar
  customPatterns?: PiiPattern[];  // patterns adicionais do usuário
  disabledTypes?: string[];     // tipos a ignorar
}

export interface PiiPattern {
  type: string;
  regex: RegExp;
  confidence: "high" | "medium" | "low";
  locale?: string;
}
