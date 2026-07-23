import { describe, it, expect } from "vitest";
import { FrontmatterParser } from "../infrastructure/frontmatter-parser.js";

describe("OKF Interoperability", () => {
  it("preserves unknown keys during round-trip", () => {
    const parser = new FrontmatterParser();
    const raw = `---
type: Skill
custom_unknown_key: "some_value"
---
# Body
Test`;

    const doc = parser.parse(raw, "test.md", ".");
    
    expect(doc.frontmatter.type).toBe("Skill");
    expect(doc.frontmatter.custom_unknown_key).toBe("some_value");

    const serialized = parser.serialize(doc.frontmatter, doc.body);
    expect(serialized).toContain("custom_unknown_key: some_value");
  });

  it("tolerates unknown types", () => {
    const parser = new FrontmatterParser();
    const raw = `---
type: SomeBrandNewUnknownType
---
# Body
Test`;

    const doc = parser.parse(raw, "test2.md", ".");
    expect(doc.frontmatter.type).toBe("SomeBrandNewUnknownType");
  });
  
  it("throws validation error if type is missing", () => {
    const parser = new FrontmatterParser();
    const raw = `---
title: Missing Type
---
# Body
Test`;

    expect(() => parser.parse(raw, "test3.md", ".")).toThrow(/type/);
  });
});
