import { describe, it, expect } from "vitest";
import {
  parseExtensionConfig,
  buildValidateCommand,
  buildCompileCommand,
} from "../utils/config.js";
import { analyzeOkfFrontmatter } from "../utils/diagnostics.js";
import { getOkfFrontmatterCompletions } from "../utils/completion.js";

describe("AKCP Extension Config, Diagnostics & Completion Utilities", () => {
  it("should return default config when raw is empty", () => {
    const config = parseExtensionConfig({});
    expect(config.akcpExecutable).toBe("npx akcp");
    expect(config.defaultProfile).toBe("software");
  });

  it("should parse custom executable", () => {
    const config = parseExtensionConfig({ akcpExecutable: "akcp-cli" });
    expect(config.akcpExecutable).toBe("akcp-cli");
  });

  it("should build valid validate and compile commands", () => {
    const config = parseExtensionConfig({ akcpExecutable: "pnpm akcp" });
    expect(buildValidateCommand(config)).toBe("pnpm akcp validate");
    expect(buildCompileCommand(config)).toBe("pnpm akcp compile");
  });

  it("should validate well-formed OKF frontmatter with zero issues", () => {
    const content = [
      "---",
      "type: skill",
      "title: TypeScript Architecture",
      "confidence: 0.95",
      "freshnessTtlDays: 90",
      "---",
      "# TypeScript",
    ].join("\n");

    const issues = analyzeOkfFrontmatter(content);
    expect(issues).toHaveLength(0);
  });

  it("should flag missing frontmatter and invalid confidence in OKF documents", () => {
    expect(analyzeOkfFrontmatter("# No frontmatter")[0]?.code).toBe(
      "OKF_MISSING_FRONTMATTER",
    );

    const invalidDoc = [
      "---",
      "title: Missing Type and Bad Confidence",
      "confidence: 1.5",
      "---",
      "Body",
    ].join("\n");
    const issues = analyzeOkfFrontmatter(invalidDoc);
    expect(issues.map((i) => i.code)).toContain("OKF_INVALID_CONFIDENCE");
    expect(issues.map((i) => i.code)).toContain("OKF_MISSING_TYPE");
  });

  it("should provide frontmatter key and type completions", () => {
    const keyItems = getOkfFrontmatterCompletions("");
    expect(keyItems.some((k) => k.label === "type")).toBe(true);
    expect(keyItems.some((k) => k.label === "freshnessTtlDays")).toBe(true);

    const typeItems = getOkfFrontmatterCompletions("type: ");
    expect(typeItems.some((t) => t.label === "runbook")).toBe(true);
    expect(typeItems.some((t) => t.label === "skill")).toBe(true);
  });
});
