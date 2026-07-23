import { describe, it, expect } from "vitest";
import { generateBuildPlan, printBuildPlan } from "../../planner/build-plan.js";
import type { AkcpConfig } from "../../config/akcp-config-schema.js";

describe("Build Plan", () => {
  it("should generate and print a full build plan", () => {
    const config: AkcpConfig = {
      version: "1",
      compile: {
        sources: [
          { type: "okf-files", path: "src" },
          { type: "custom", url: "http", exclude: ["node_modules"] },
        ],
        targets: [{ type: "okf-bundle", out: "dist" }],
        budgets: {
          maxTokens: 100,
          maxDocuments: 10,
        },
      },
      controlPlane: {
        policies: {
          disableDangerousTools: true,
          requireApprovalFor: ["tool1"],
        },
        evalGates: [{ name: "gate1", strict: true }],
        mcp: {
          profileServer: { enabled: true },
          automationServer: { enabled: true },
        },
      },
    };

    const plan = generateBuildPlan(config);
    expect(plan.sourcesToRead.length).toBe(2);
    expect(plan.activePolicies.length).toBe(2);
    expect(plan.activeEvalGates.length).toBe(1);

    const output = printBuildPlan(plan);
    expect(output).toContain("Read: src");
    expect(output).toContain("excluding node_modules");
    expect(output).toContain("Generate: okf-bundle");
    expect(output).toContain("Max Tokens: 100");
    expect(output).toContain("Max Documents: 10");
    expect(output).toContain("disableDangerousTools");
    expect(output).toContain("gate1 (strict: true)");
    expect(output).toContain("Profile Server: Enabled");
    expect(output).toContain("Automation Server: Enabled");
  });

  it("should generate and print an empty build plan", () => {
    const config: AkcpConfig = { version: "1" };
    const plan = generateBuildPlan(config);

    expect(plan.sourcesToRead.length).toBe(0);
    expect(plan.targetsToGenerate.length).toBe(0);
    expect(plan.activePolicies.length).toBe(0);
    expect(plan.activeEvalGates.length).toBe(0);

    const output = printBuildPlan(plan);
    expect(output).toContain("None");
    expect(output).toContain("Profile Server: Enabled");
    expect(output).toContain("Automation Server: Disabled");
  });
});
