import { describe, it, expect } from "vitest";
import {
  lintPolicyRules,
  lintPolicyCard,
  patternSubsumes,
  matcherSubsumes,
} from "../../policies/linter.js";
import type { PolicyRule } from "../../policies/engine.js";
import type { PolicyCard } from "../../policy/types.js";

describe("Policy Linter", () => {
  describe("Pattern and Matcher Subsumption", () => {
    it("recognizes wildcard as subsuming any pattern", () => {
      expect(patternSubsumes("*", "read_*")).toBe(true);
      expect(patternSubsumes("*", "write_db")).toBe(true);
      expect(patternSubsumes("read_*", "*")).toBe(false);
    });

    it("recognizes prefix wildcards subsuming matching prefixes", () => {
      expect(patternSubsumes("read_*", "read_file")).toBe(true);
      expect(patternSubsumes("read_*", "read_profile")).toBe(true);
      expect(patternSubsumes("read_*", "write_file")).toBe(false);
      expect(patternSubsumes("cloud_*", "cloud_vm_*")).toBe(true);
    });

    it("evaluates matcher subsumption across tools, riskLevels, and scopes", () => {
      const broad = {
        tools: ["*"],
        riskLevels: ["low", "medium", "high", "critical"],
      };
      const narrow = {
        tools: ["read_db"],
        riskLevels: ["low"],
      };
      expect(matcherSubsumes(broad, narrow)).toBe(true);
      expect(matcherSubsumes(narrow, broad)).toBe(false);
    });
  });

  describe("Rule Shadowing Detection", () => {
    it("flags error when a higher-priority broad rule shadows a restrictive rule with different effect", () => {
      const rules: PolicyRule[] = [
        {
          id: "allow-all",
          priority: 10,
          effect: "allow",
          match: { tools: ["*"] },
        },
        {
          id: "deny-critical-delete",
          priority: 20,
          effect: "deny",
          match: { tools: ["delete_database"] },
        },
      ];

      const result = lintPolicyRules(rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("SHADOWED_RULE");
      expect(result.issues[0].severity).toBe("error");
      expect(result.issues[0].ruleId).toBe("deny-critical-delete");
      expect(result.issues[0].targetRuleId).toBe("allow-all");
    });

    it("flags warning when a higher-priority rule makes a lower-priority rule redundant with the same effect", () => {
      const rules: PolicyRule[] = [
        {
          id: "allow-all-reads",
          priority: 5,
          effect: "allow",
          match: { tools: ["read_*"] },
        },
        {
          id: "allow-read-config",
          priority: 10,
          effect: "allow",
          match: { tools: ["read_config"] },
        },
      ];

      const result = lintPolicyRules(rules);
      expect(result.valid).toBe(true); // warnings do not invalidate the policy set
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("REDUNDANT_RULE");
      expect(result.issues[0].severity).toBe("warning");
      expect(result.issues[0].ruleId).toBe("allow-read-config");
    });

    it("does not flag shadowing when the higher-priority rule has conditions that narrow its scope", () => {
      const rules: PolicyRule[] = [
        {
          id: "allow-all-prod-only",
          priority: 10,
          effect: "allow",
          match: { tools: ["*"] },
          conditions: [
            { type: "environment", params: { environment: "production" } },
          ],
        },
        {
          id: "deny-delete",
          priority: 20,
          effect: "deny",
          match: { tools: ["delete_database"] },
        },
      ];

      const result = lintPolicyRules(rules);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe("Contradictory Rules Detection", () => {
    it("flags error when two rules at the same priority have opposing effects for identical matchers", () => {
      const rules: PolicyRule[] = [
        {
          id: "rule-allow-deploy",
          priority: 50,
          effect: "allow",
          match: { tools: ["cloud_deploy"] },
        },
        {
          id: "rule-deny-deploy",
          priority: 50,
          effect: "deny",
          match: { tools: ["cloud_deploy"] },
        },
      ];

      const result = lintPolicyRules(rules);
      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("CONTRADICTORY_RULE");
      expect(result.issues[0].severity).toBe("error");
    });
  });

  describe("PolicyCard Integration", () => {
    it("passes validation for well-formed non-conflicting PolicyCard", () => {
      const card: PolicyCard = {
        metadata: {
          name: "Standard Security Card",
          version: "1.0.0",
          description: "Safe default policy card",
        },
        appliesTo: {
          capabilities: ["career.*"],
          riskLevels: ["low", "medium"],
        },
        rules: [
          {
            name: "allow-reads",
            effect: "allow",
          },
        ],
      };

      const result = lintPolicyCard(card);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });
});
