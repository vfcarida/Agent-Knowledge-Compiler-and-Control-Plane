import { describe, expect, it } from "vitest";
import { EducationFrontmatterSchema } from "../domain/schemas.js";

describe("EducationFrontmatterSchema", () => {
  it("accepts minimal valid education frontmatter", () => {
    const result = EducationFrontmatterSchema.safeParse({
      type: "Education",
      schemaVersion: "akcp.profile/v1",
      institution: "USP",
      degree: "BSc",
    });

    expect(result.success).toBe(true);
  });

  it("rejects education frontmatter with wrong type", () => {
    const result = EducationFrontmatterSchema.safeParse({
      type: "Skill",
      institution: "USP",
    });

    expect(result.success).toBe(false);
  });
});
