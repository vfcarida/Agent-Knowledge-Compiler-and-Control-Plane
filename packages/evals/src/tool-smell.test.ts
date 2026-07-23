import { describe, it, expect } from "vitest";
import { profileServerCapabilities } from "@akcp/mcp-profile-server/dist/capabilities.js";
import { automationServerCapabilities } from "@akcp/mcp-automation-server/dist/capabilities.js";

describe("Tool Description Smell Test", () => {
  const allTools = [
    ...profileServerCapabilities,
    ...automationServerCapabilities,
  ];

  it("ensures all tools are loaded", () => {
    expect(allTools.length).toBeGreaterThan(0);
  });

  allTools.forEach((tool) => {
    describe(`Tool: ${tool.name}`, () => {
      it("description length must be between 50 and 400 chars", () => {
        expect(tool.description.length).toBeGreaterThanOrEqual(50);
        expect(tool.description.length).toBeLessThanOrEqual(400);
      });

      it('must declare "Side effects:"', () => {
        expect(tool.description).toMatch(/Side effects:/i);
      });

      it('must declare usage boundaries ("When to use" / "When not to use")', () => {
        expect(tool.description).toMatch(/When to use:/i);
        expect(tool.description).toMatch(/When not to use:/i);
      });

      it("must provide an example if risk is high or critical", () => {
        if (tool.riskLevel === "high" || tool.riskLevel === "critical") {
          expect(tool.description).toMatch(/(Example|Usage):/i);
        }
      });
    });
  });
});
