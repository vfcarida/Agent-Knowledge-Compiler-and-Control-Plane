import { describe, it, expect } from "vitest";
import { syncAgentInstructions } from "../../agents/sync.js";

describe("syncAgentInstructions", () => {
  it("generates default managed context block for empty input", () => {
    const output = syncAgentInstructions("");
    expect(output).toContain("<!-- akcp:start -->");
    expect(output).toContain("<!-- akcp:end -->");
    expect(output).toContain("## 1. Project Purpose");
    expect(output).toContain("## 9. Commit / PR Conventions");
    expect(output.endsWith("\n")).toBe(true);
  });

  it("replaces existing managed block within markers", () => {
    const existing = `# Custom Header
<!-- akcp:start -->
old managed block
<!-- akcp:end -->
# Custom Footer`;

    const output = syncAgentInstructions(existing, {
      projectPurpose: "Custom Purpose Here",
    });

    expect(output).toContain("# Custom Header\n<!-- akcp:start -->");
    expect(output).toContain("Custom Purpose Here");
    expect(output).toContain("<!-- akcp:end -->\n# Custom Footer");
    expect(output).not.toContain("old managed block");
  });

  it("prepends managed block when file has content but no markers", () => {
    const existing = "# Standalone Developer Notes\nSome notes here.";
    const output = syncAgentInstructions(existing);

    expect(output.startsWith("<!-- akcp:start -->")).toBe(true);
    expect(output).toContain(
      "<!-- akcp:end -->\n\n# Standalone Developer Notes",
    );
  });

  it("supports custom options for all managed sections", () => {
    const output = syncAgentInstructions("", {
      projectPurpose: "Purpose Test",
      architectureBoundaries: "Boundaries Test",
      contextSources: "Sources Test",
      commandsToRun: "Commands Test",
      forbiddenActions: "Forbidden Test",
      docsToConsult: "Docs Test",
      testingRequirements: "Testing Test",
      securityRequirements: "Security Test",
      commitConventions: "Commit Test",
    });

    expect(output).toContain("Purpose Test");
    expect(output).toContain("Boundaries Test");
    expect(output).toContain("Sources Test");
    expect(output).toContain("Commands Test");
    expect(output).toContain("Forbidden Test");
    expect(output).toContain("Docs Test");
    expect(output).toContain("Testing Test");
    expect(output).toContain("Security Test");
    expect(output).toContain("Commit Test");
  });
});
