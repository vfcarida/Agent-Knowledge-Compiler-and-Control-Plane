import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { IRConceptSchema, AgentKnowledgeIRSchema } from "../../ir/schema.js";

/**
 * Property-based coverage for the round-trip invariant: any concept our own
 * schema considers valid must survive a JSON.stringify/parse cycle and
 * re-validate identically. Complements the fixture-based tests in
 * schema.test.ts, which mostly check individual documented edge cases.
 */

const conceptArb = fc.record({
  conceptId: fc.stringMatching(/^[a-z][a-z0-9-]{2,20}$/),
  type: fc.constantFrom("Document", "Skill", "Experience", "Endpoint"),
  source: fc.record({
    filePath: fc.stringMatching(/^[a-z0-9/_.-]{3,30}$/),
    format: fc.constantFrom("okf/markdown", "markdown", "openapi/endpoint"),
  }),
  frontmatter: fc.dictionary(
    fc.stringMatching(/^[a-z][a-zA-Z0-9]{1,10}$/),
    fc.oneof(fc.string(), fc.integer(), fc.boolean()),
    { maxKeys: 5 },
  ),
  body: fc.string({ maxLength: 200 }),
  budget: fc.record({
    byteSize: fc.nat(),
    estimatedTokens: fc.nat(),
  }),
  status: fc.constantFrom("active", "stale", "deprecated", "archived"),
  isStale: fc.boolean(),
});

describe("IR schema (property-based)", () => {
  it("any concept accepted by IRConceptSchema still validates after a JSON round-trip", () => {
    fc.assert(
      fc.property(conceptArb, (candidate) => {
        const parsed = IRConceptSchema.parse(candidate);
        const roundTripped = JSON.parse(JSON.stringify(parsed));
        // Re-validating must not throw, and must reproduce the same conceptId/type —
        // i.e. serialization is lossless for everything the schema itself cares about.
        const reparsed = IRConceptSchema.parse(roundTripped);
        expect(reparsed.conceptId).toBe(parsed.conceptId);
        expect(reparsed.type).toBe(parsed.type);
        expect(reparsed.body).toBe(parsed.body);
      }),
    );
  });

  it("a valid IR envelope wrapping any generated concept always round-trips through the full AgentKnowledgeIRSchema", () => {
    fc.assert(
      fc.property(
        conceptArb,
        fc.stringMatching(/^[a-z][a-z0-9-]{2,15}$/),
        (concept, bundleId) => {
          const ir = {
            irVersion: "1.0.0",
            okfVersion: "0.1.0",
            bundleId,
            buildId: `bld_${bundleId}`,
            timestamp: new Date(0).toISOString(),
            concepts: [concept],
            links: [],
            sourceHashes: {},
          };

          const parsed = AgentKnowledgeIRSchema.parse(ir);
          const roundTripped = AgentKnowledgeIRSchema.parse(
            JSON.parse(JSON.stringify(parsed)),
          );
          expect(roundTripped.concepts).toHaveLength(1);
          expect(roundTripped.concepts[0]?.conceptId).toBe(concept.conceptId);
        },
      ),
    );
  });
});
