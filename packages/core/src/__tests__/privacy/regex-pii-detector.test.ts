import { describe, it, expect } from "vitest";
import { RegexPiiDetector } from "../../privacy/regex-pii-detector.js";

describe("RegexPiiDetector", () => {
  it("should detect CPF", () => {
    const detector = new RegexPiiDetector({ locales: ["br"] });
    const matches = detector.detect("Meu CPF é 123.456.789-00");
    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe("cpf");
    expect(matches[0].confidence).toBe("high");
  });

  it("should detect CNPJ", () => {
    const detector = new RegexPiiDetector({ locales: ["br"] });
    const matches = detector.detect("CNPJ: 12.345.678/0001-90");
    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe("cnpj");
  });

  it("should detect email", () => {
    const detector = new RegexPiiDetector();
    const matches = detector.detect("Contact: user@example.com");
    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe("email");
  });

  it("should detect SSN", () => {
    const detector = new RegexPiiDetector({ locales: ["us"] });
    const matches = detector.detect("SSN: 123-45-6789");
    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe("ssn");
  });

  it("should detect credit card", () => {
    const detector = new RegexPiiDetector();
    const matches = detector.detect("Card: 4111-1111-1111-1111");
    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe("credit_card");
  });

  it("should respect disabled types", () => {
    const detector = new RegexPiiDetector({ disabledTypes: ["email"] });
    const matches = detector.detect("user@example.com and 123-45-6789");
    expect(matches.every((m) => m.type !== "email")).toBe(true);
  });

  it("should support custom patterns", () => {
    const detector = new RegexPiiDetector({
      customPatterns: [
        { type: "internal_id", regex: /EMP-\d{6}/g, confidence: "medium" },
      ],
    });
    const matches = detector.detect("Employee EMP-123456");
    expect(matches.some((m) => m.type === "internal_id")).toBe(true);
  });

  it("should filter by locale", () => {
    const detector = new RegexPiiDetector({ locales: ["us"] });
    const matches = detector.detect("CPF: 123.456.789-00 SSN: 123-45-6789");
    expect(matches.every((m) => m.type !== "cpf")).toBe(true);
    expect(matches.some((m) => m.type === "ssn")).toBe(true);
  });
});
