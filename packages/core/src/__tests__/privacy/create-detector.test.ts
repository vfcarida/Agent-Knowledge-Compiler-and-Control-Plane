import { describe, it, expect } from "vitest";
import { createPiiDetector } from "../../privacy/create-detector.js";
import { RegexPiiDetector } from "../../privacy/regex-pii-detector.js";
import { CompositePiiDetector } from "../../privacy/composite-detector.js";

describe("createPiiDetector", () => {
  it("returns a plain RegexPiiDetector by default (enableNerLite unset)", () => {
    const detector = createPiiDetector();
    expect(detector).toBeInstanceOf(RegexPiiDetector);
  });

  it("returns a plain RegexPiiDetector when enableNerLite is explicitly false", () => {
    const detector = createPiiDetector({ enableNerLite: false });
    expect(detector).toBeInstanceOf(RegexPiiDetector);
  });

  it("returns a CompositePiiDetector when enableNerLite is true", () => {
    const detector = createPiiDetector({ enableNerLite: true });
    expect(detector).toBeInstanceOf(CompositePiiDetector);
  });

  it("composite detector still catches regex-matched PII when NER-lite is enabled", async () => {
    const detector = createPiiDetector({ enableNerLite: true });
    const matches = await detector.detect("Contact: jane@example.com");
    expect(matches.some((m) => m.type === "email")).toBe(true);
  });
});
