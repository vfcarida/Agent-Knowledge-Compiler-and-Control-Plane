import { describe, it, expect } from "vitest";
import { CompositePiiDetector } from "../../privacy/composite-detector.js";
import type { PiiDetector, PiiMatch } from "../../privacy/pii-detector.js";

function fakeDetector(matches: PiiMatch[]): PiiDetector {
  return {
    detect: () => matches,
    supportedTypes: () => [...new Set(matches.map((m) => m.type))],
  };
}

describe("CompositePiiDetector", () => {
  it("merges non-overlapping matches from multiple detectors", async () => {
    const a = fakeDetector([
      { type: "email", value: "x@y.com", start: 0, end: 7, confidence: "high" },
    ]);
    const b = fakeDetector([
      {
        type: "person_name",
        value: "John Smith",
        start: 20,
        end: 30,
        confidence: "low",
      },
    ]);

    const composite = new CompositePiiDetector([a, b]);
    const matches = await composite.detect("irrelevant, detectors are stubbed");

    expect(matches).toHaveLength(2);
    expect(matches.map((m) => m.type).sort()).toEqual(["email", "person_name"]);
  });

  it("drops a later detector's match when it overlaps an earlier one (priority order)", async () => {
    const first = fakeDetector([
      {
        type: "email",
        value: "overlap",
        start: 5,
        end: 15,
        confidence: "high",
      },
    ]);
    const second = fakeDetector([
      {
        type: "person_name",
        value: "overlap-ish",
        start: 10,
        end: 20,
        confidence: "low",
      },
    ]);

    const composite = new CompositePiiDetector([first, second]);
    const matches = await composite.detect("irrelevant");

    expect(matches).toHaveLength(1);
    expect(matches[0]?.type).toBe("email");
  });

  it("returns matches sorted by start position regardless of detector order", async () => {
    const a = fakeDetector([
      { type: "email", value: "later", start: 30, end: 40, confidence: "high" },
    ]);
    const b = fakeDetector([
      { type: "ssn", value: "earlier", start: 0, end: 5, confidence: "high" },
    ]);

    const composite = new CompositePiiDetector([a, b]);
    const matches = await composite.detect("irrelevant");

    expect(matches.map((m) => m.start)).toEqual([0, 30]);
  });

  it("supportedTypes unions all wrapped detectors' types", () => {
    const a = fakeDetector([
      { type: "email", value: "e", start: 0, end: 1, confidence: "high" },
    ]);
    const b = fakeDetector([
      { type: "person_name", value: "n", start: 0, end: 1, confidence: "low" },
    ]);

    const composite = new CompositePiiDetector([a, b]);
    expect(composite.supportedTypes().sort()).toEqual(["email", "person_name"]);
  });
});
