import { describe, it, expect } from "vitest";
import { NerLiteDetector } from "../../privacy/ner-lite-detector.js";

describe("NerLiteDetector", () => {
  it("detects an honorific-prefixed name at medium confidence", () => {
    const detector = new NerLiteDetector();
    const matches = detector.detect(
      "Please contact Dr. Alice Johnson for details.",
    );

    const found = matches.find((m) => m.value.includes("Alice Johnson"));
    expect(found).toBeDefined();
    expect(found?.type).toBe("person_name");
    expect(found?.confidence).toBe("medium");
  });

  it("detects a bare Title Case name sequence at low confidence", () => {
    const detector = new NerLiteDetector();
    const matches = detector.detect(
      "The invoice was signed by John Smith yesterday.",
    );

    const found = matches.find((m) => m.value === "John Smith");
    expect(found).toBeDefined();
    expect(found?.confidence).toBe("low");
  });

  it("does not flag common sentence-initial / calendar words as names", () => {
    const detector = new NerLiteDetector();
    const matches = detector.detect("The meeting is on Monday in January.");

    expect(matches.find((m) => m.value.startsWith("The"))).toBeUndefined();
    expect(matches.find((m) => m.value.startsWith("Monday"))).toBeUndefined();
    expect(matches.find((m) => m.value.startsWith("January"))).toBeUndefined();
  });

  it("never reports high confidence (heuristic, not authoritative)", () => {
    const detector = new NerLiteDetector();
    const matches = detector.detect(
      "Dr. Maria Garcia met with Robert Chen and Prof. Ana Lima.",
    );

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((m) => m.confidence !== "high")).toBe(true);
  });

  it("supportedTypes reports person_name", () => {
    expect(new NerLiteDetector().supportedTypes()).toEqual(["person_name"]);
  });
});
