import { describe, it, expect } from "vitest";
import { syncAgentInstructions } from "@akcp/core";

describe("Agent Instructions Sync", () => {
  const START_MARKER = "<!-- akcp:start -->";
  const END_MARKER = "<!-- akcp:end -->";

  it("generates a new block if file is empty", () => {
    const result = syncAgentInstructions("");
    expect(result).toContain(START_MARKER);
    expect(result).toContain(END_MARKER);
    expect(result).toContain("## 1. Project Purpose");
  });

  it("prepends the block to existing content if no markers exist", () => {
    const existing = "# User Rule\nDo not write bugs.";
    const result = syncAgentInstructions(existing);
    expect(result).toContain(START_MARKER);
    expect(result).toContain(existing);
    expect(result.indexOf(START_MARKER)).toBeLessThan(
      result.indexOf("User Rule"),
    );
  });

  it("replaces the existing block and preserves surrounding content", () => {
    const existing = `Before block
${START_MARKER}
Old stuff
${END_MARKER}
After block`;

    const result = syncAgentInstructions(existing);
    expect(result).toContain("Before block");
    expect(result).toContain("After block");
    expect(result).not.toContain("Old stuff");
    expect(result).toContain("## 1. Project Purpose");
  });

  it("is idempotent", () => {
    const firstRun = syncAgentInstructions("# Custom User Block\n");
    const secondRun = syncAgentInstructions(firstRun);
    expect(firstRun).toEqual(secondRun);
  });
});
