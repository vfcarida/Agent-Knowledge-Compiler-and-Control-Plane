import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import path from "path";

describe("Agent Knowledge Readiness Scorecard Benchmark", () => {
  it("should evaluate the sample bundle and produce a scorecard markdown report", async () => {
    const bundlePath = path.resolve(__dirname, "sample-bundle");
    const cliPath = path.resolve(
      __dirname,
      "../../../../packages/cli/dist/index.js",
    );

    const output = execSync(
      `node ${cliPath} scorecard --bundle ${bundlePath} --format markdown`,
      { encoding: "utf-8" },
    );

    // Check that it's markdown and contains the required elements
    expect(output).toContain("# Agent Knowledge Readiness Scorecard");
    expect(output).toContain("**Total Score**:");
    expect(output).toContain("## Dimensions");
    expect(output).toContain("## Recommendations");

    // For this specific bundle, it should have a decent score (e.g. MCP target, policies)
    expect(output).toMatch(/\*\*Total Score\*\*: \d{2,3} \/ 100/);
  }, 30000);
});
