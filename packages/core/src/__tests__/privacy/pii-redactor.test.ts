import { describe, it, expect } from "vitest";
import { PiiRedactor } from "../../privacy/pii-redactor.js";
import { RegexPiiDetector } from "../../privacy/regex-pii-detector.js";

describe("PiiRedactor", () => {
  it("redacts email and phone by default", async () => {
    const redactor = new PiiRedactor(new RegexPiiDetector());
    const text = "Contact me at john.doe@example.com or call 555-555-1234.";
    const result = await redactor.redact(text);
    
    expect(result.redactedText).not.toContain("john.doe@example.com");
    expect(result.redactedText).toContain("<EMAIL_REDACTED>");
    expect(result.redactedText).not.toContain("555-555-1234");
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it("supports tokenized mode", async () => {
    const redactor = new PiiRedactor(new RegexPiiDetector());
    const text = "Email: john@example.com";
    const result = await redactor.redact(text, { mode: "tokenize" });
    
    expect(result.redactedText).toMatch(/<PII:EMAIL:[a-f0-9]{8}>/);
    expect(result.blocked).toBe(false);
  });

  it("blocks if unredacted high risk PII is found in detect-only mode", async () => {
    const redactor = new PiiRedactor(new RegexPiiDetector());
    const text = "My credit card is 1234 5678 1234 5678.";
    const result = await redactor.redact(text, { 
      mode: "detect-only", 
      blockedClasses: ["credit_card"], 
      failOnUnredactedHighRiskPii: true 
    });
    
    expect(result.blocked).toBe(true);
    expect(result.redactedText).toContain("1234 5678 1234 5678"); // not redacted, but blocked
  });
});
