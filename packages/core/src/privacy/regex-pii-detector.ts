import type { PiiDetector, PiiMatch, PiiDetectorConfig, PiiPattern } from "./pii-detector.js";

const BUILTIN_PATTERNS: PiiPattern[] = [
  // US
  { type: "ssn", regex: /\b\d{3}-\d{2}-\d{4}\b/g, confidence: "high", locale: "us" },

  // BR
  { type: "cpf", regex: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, confidence: "high", locale: "br" },
  { type: "cnpj", regex: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, confidence: "high", locale: "br" },
  { type: "phone_br", regex: /(?:\+55\s?)?\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g, confidence: "medium", locale: "br" },
  { type: "cep", regex: /\b\d{5}-\d{3}\b/g, confidence: "low", locale: "br" },

  // Universal
  { type: "email", regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, confidence: "high" },
  { type: "credit_card", regex: /\b(?:\d{4}[- ]?){3}\d{4}\b/g, confidence: "high" },
  { type: "ipv4", regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, confidence: "medium" },
  { type: "iban", regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g, confidence: "high" },
  
  // Keep the old phone regex so pii-redactor tests don't break
  { type: "phone", regex: /(?:\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/g, confidence: "medium" },
];

export class RegexPiiDetector implements PiiDetector {
  private patterns: PiiPattern[];

  constructor(config: PiiDetectorConfig = {}) {
    let patterns = [...BUILTIN_PATTERNS];

    // Filter by locale
    if (config.locales && config.locales.length > 0) {
      patterns = patterns.filter(
        (p) => !p.locale || config.locales!.includes(p.locale),
      );
    }

    // Remove disabled types
    if (config.disabledTypes && config.disabledTypes.length > 0) {
      patterns = patterns.filter((p) => !config.disabledTypes!.includes(p.type));
    }

    // Add custom patterns
    if (config.customPatterns) {
      patterns.push(...config.customPatterns);
    }

    this.patterns = patterns;
  }

  detect(text: string): PiiMatch[] {
    const matches: PiiMatch[] = [];

    for (const pattern of this.patterns) {
      // Reset lastIndex for global regex
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        matches.push({
          type: pattern.type,
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: pattern.confidence,
          locale: pattern.locale,
        });
      }
    }

    return matches;
  }

  supportedTypes(): string[] {
    return [...new Set(this.patterns.map((p) => p.type))];
  }
}
