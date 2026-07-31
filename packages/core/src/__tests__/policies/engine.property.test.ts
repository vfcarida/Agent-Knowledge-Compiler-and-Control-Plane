import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  evaluatePolicies,
  type PolicyRule,
  type PolicyRequest,
} from "../../policies/engine.js";

/**
 * Property-based coverage for the policy engine's core invariants. Complements
 * the example-based tests in cedar-provider.test.ts/opa-provider.test.ts by
 * generating many rule/request combinations rather than a handful of fixtures.
 */

const toolArb = fc.stringMatching(/^[a-z][a-z_]{2,15}$/);
const agentArb = fc.stringMatching(/^agent-[0-9]{1,4}$/);
const riskLevelArb = fc.constantFrom("low", "medium", "high", "critical");
const effectArb = fc.constantFrom<"allow" | "deny">("allow", "deny");

function ruleArb(priority: number): fc.Arbitrary<PolicyRule> {
  return fc.record({
    id: fc.uuid(),
    priority: fc.constant(priority),
    effect: effectArb,
    match: fc.record({
      tools: fc.option(fc.array(toolArb, { minLength: 1, maxLength: 3 }), {
        nil: undefined,
      }),
    }),
  });
}

const requestArb: fc.Arbitrary<PolicyRequest> = fc.record({
  tool: toolArb,
  agentId: agentArb,
  riskLevel: riskLevelArb,
  scopes: fc.array(fc.string(), { maxLength: 3 }),
});

describe("evaluatePolicies (property-based)", () => {
  it("is deterministic: evaluating the same rules/request twice yields the same decision", () => {
    fc.assert(
      fc.property(
        fc.array(ruleArb(0), { minLength: 0, maxLength: 8 }).chain((rules) =>
          fc.tuple(
            fc.constant(
              rules.map((r, i) => ({ ...r, priority: i })), // distinct priorities
            ),
            requestArb,
          ),
        ),
        ([rules, request]) => {
          const first = evaluatePolicies(rules, request);
          const second = evaluatePolicies(rules, request);
          expect(second.effect).toBe(first.effect);
          expect(second.matchedRule.id).toBe(first.matchedRule.id);
        },
      ),
    );
  });

  it("always resolves to the single lowest-priority rule that matches, never a lower-priority one", () => {
    fc.assert(
      fc.property(
        fc
          .array(ruleArb(0), { minLength: 1, maxLength: 8 })
          .map((rules) => rules.map((r, i) => ({ ...r, priority: i }))),
        requestArb,
        (rules, request) => {
          const decision = evaluatePolicies(rules, request);
          const matchingPriorities = rules
            .filter(
              (r) => !r.match.tools || r.match.tools.includes(request.tool),
            )
            .map((r) => r.priority);

          if (matchingPriorities.length === 0) {
            expect(decision.matchedRule.id).toBe("DEFAULT_DENY");
            expect(decision.effect).toBe("deny");
          } else {
            const lowest = Math.min(...matchingPriorities);
            expect(decision.matchedRule.priority).toBe(lowest);
          }
        },
      ),
    );
  });

  it("with no rules at all, always denies (closed-world default)", () => {
    fc.assert(
      fc.property(requestArb, (request) => {
        const decision = evaluatePolicies([], request);
        expect(decision.effect).toBe("deny");
        expect(decision.matchedRule.id).toBe("DEFAULT_DENY");
      }),
    );
  });
});
