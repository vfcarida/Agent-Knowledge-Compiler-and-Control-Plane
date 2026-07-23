import crypto from "node:crypto";
import type { PiiDetector, PiiMatch } from "./pii-detector.js";
import { RegexPiiDetector } from "./regex-pii-detector.js";

export interface PiiRedactionResult {
  redactedText: string;
  findings: PiiMatch[];
  blocked: boolean;
}

export interface PiiRedactorOptions {
  mode: "redact" | "tokenize" | "detect-only";
  allowedClasses?: string[];
  blockedClasses?: string[];
  tokenFormat?: string;
  failOnUnredactedHighRiskPii?: boolean;
}

export class PiiRedactor {
  private detector: PiiDetector;
  
  constructor(detector?: PiiDetector) {
    this.detector = detector || new RegexPiiDetector();
  }

  async redact(text: string, options: PiiRedactorOptions = { mode: "redact" }): Promise<PiiRedactionResult> {
    const findings = await this.detector.detect(text);
    let redactedText = text;
    let blocked = false;
    
    // Sort findings descending by start to avoid shifting indices when replacing
    const sortedFindings = [...findings].sort((a, b) => b.start - a.start);
    
    for (const finding of sortedFindings) {
      if (options.allowedClasses?.includes(finding.type)) {
        continue;
      }
      
      const isBlockedClass = options.blockedClasses?.includes(finding.type);
      
      if (options.mode === "detect-only") {
        if (isBlockedClass && options.failOnUnredactedHighRiskPii) {
          blocked = true;
        }
        continue;
      }

      let replacement = "***";
      if (options.mode === "tokenize") {
        const hash = crypto.createHash("sha256").update(finding.value).digest("hex").slice(0, 8);
        const format = options.tokenFormat || "<PII:{type}:{stableHash}>";
        replacement = format
          .replace("{type}", finding.type.toUpperCase())
          .replace("{stableHash}", hash);
      } else {
        // redact mode
        replacement = `<${finding.type.toUpperCase()}_REDACTED>`;
      }
      
      redactedText = redactedText.substring(0, finding.start) + replacement + redactedText.substring(finding.end);
    }
    
    return {
      redactedText,
      findings,
      blocked
    };
  }
}
