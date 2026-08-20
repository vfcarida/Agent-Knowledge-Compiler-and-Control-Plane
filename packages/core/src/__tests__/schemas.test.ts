import { describe, expect, it } from "vitest";
import {
  EducationFrontmatterSchema,
  ProfileRegistry,
} from "../domain/schemas.js";

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

describe("ProfileRegistry", () => {
  it("resolves schemas for all known profiles and fallback", () => {
    expect(ProfileRegistry.getProfileSchema("career")).toBeDefined();
    expect(ProfileRegistry.getProfileSchema("software-project")).toBeDefined();
    expect(ProfileRegistry.getProfileSchema("software")).toBeDefined();
    expect(ProfileRegistry.getProfileSchema("customer-support")).toBeDefined();
    expect(ProfileRegistry.getProfileSchema("it-operations")).toBeDefined();
    expect(ProfileRegistry.getProfileSchema("it-ops")).toBeDefined();
    expect(ProfileRegistry.getProfileSchema("okf")).toBeDefined();
    expect(ProfileRegistry.getProfileSchema("standard")).toBeDefined();
    expect(ProfileRegistry.getProfileSchema("none")).toBeDefined();
    expect(ProfileRegistry.getProfileSchema("unknown-profile")).toBeDefined();
  });
});
