import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { FrontmatterParser } from "@akcp/core";

describe("Domain Adapters Integration", () => {
  it("validates that software-project sample data parses as OKF", () => {
    const evalsDir = path.dirname(fileURLToPath(import.meta.url));
    const sampleFilePath = path.resolve(
      evalsDir,
      "../../../examples/domains/career/sources/experience-acmecorp.md",
    );

    expect(fs.existsSync(sampleFilePath)).toBe(true);

    const rawContent = fs.readFileSync(sampleFilePath, "utf-8");
    const parser = new FrontmatterParser();
    const doc = parser.parse(
      rawContent,
      sampleFilePath,
      path.resolve(
        evalsDir,
        "../../../examples/domains/career/sources",
      ),
    );

    expect(doc).toBeDefined();
    expect(doc.frontmatter["type"]).toBe("Experience");
    expect(doc.frontmatter["organization"]).toBe("Acme Corp");
    expect(doc.conceptId).toBe("experience-acmecorp");
    expect(doc.body).toContain("Led a team");
  });
});
