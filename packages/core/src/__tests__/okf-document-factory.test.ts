/**
 * @module __tests__/okf-document-factory.test
 * @description Unit tests for OKFDocumentFactory.
 *
 * Validates that each factory method produces a correctly structured
 * OKFDocument with:
 * - The expected `type` and `conceptId`
 * - An ISO 8601 `timestamp`
 * - An empty `filePath` (to be resolved at save time)
 * - Proper slugification of identity fields
 * - Optional fields included when provided
 */

import { describe, it, expect } from "vitest";

import { OKFDocumentFactory } from "../factories/okf-document-factory.js";

describe("OKFDocumentFactory", () => {
  // ─── Skill ──────────────────────────────────────────────────────────────────

  it("should create a Skill document with correct type and conceptId", () => {
    const doc = OKFDocumentFactory.createSkill("TypeScript");

    expect(doc.frontmatter.type).toBe("Skill");
    expect(doc.frontmatter.title).toBe("TypeScript");
    expect(doc.conceptId).toBe("skills/typescript");
    expect(doc.filePath).toBe("");
    expect(doc.body).toContain("# TypeScript");
  });

  // ─── Experience ─────────────────────────────────────────────────────────────

  it("should create an Experience document", () => {
    const doc = OKFDocumentFactory.createExperience(
      "Acme Corp",
      "Senior Engineer",
    );

    expect(doc.frontmatter.type).toBe("Experience");
    expect(doc.frontmatter.title).toBe("Senior Engineer at Acme Corp");
    expect(doc.frontmatter["company"]).toBe("Acme Corp");
    expect(doc.frontmatter["role"]).toBe("Senior Engineer");
    expect(doc.conceptId).toBe("experiences/acme-corp-senior-engineer");
    expect(doc.body).toContain("# Senior Engineer at Acme Corp");
  });

  it("should create an Experience document with all optional fields", () => {
    const doc = OKFDocumentFactory.createExperience(
      "Acme Corp",
      "Senior Engineer",
      {
        startDate: "2020-01-01",
        endDate: "2023-01-01",
        current: false,
        location: "Remote",
        tags: ["tech"],
        description: "Worked on stuff",
      },
    );
    expect(doc.frontmatter["startDate"]).toBe("2020-01-01");
    expect(doc.frontmatter["endDate"]).toBe("2023-01-01");
    expect(doc.frontmatter["current"]).toBe(false);
    expect(doc.frontmatter["location"]).toBe("Remote");
    expect(doc.frontmatter.tags).toEqual(["tech"]);
    expect(doc.frontmatter.description).toBe("Worked on stuff");
  });

  // ─── Application ───────────────────────────────────────────────────────────

  it("should create an Application document with default status Applied", () => {
    const doc = OKFDocumentFactory.createApplication(
      "BigTech",
      "Staff Engineer",
      "https://careers.bigtech.com/12345",
    );

    expect(doc.frontmatter.type).toBe("Application");
    expect(doc.frontmatter["applicationStatus"]).toBe("Applied");
    expect(doc.frontmatter["company"]).toBe("BigTech");
    expect(doc.frontmatter["position"]).toBe("Staff Engineer");
    expect(doc.frontmatter["url"]).toBe("https://careers.bigtech.com/12345");
    // conceptId should start with 'applications/' and contain date prefix + slug
    expect(doc.conceptId).toMatch(/^applications\/\d{4}-\d{2}-\d{2}-bigtech$/);
    expect(doc.filePath).toBe("");
  });

  it("should create an Application document with all optional fields", () => {
    const doc = OKFDocumentFactory.createApplication(
      "BigTech",
      "Staff",
      "http",
      {
        platform: "LinkedIn",
        applicationStatus: "Interview",
        salary: "100k",
        location: "NY",
        tags: ["fintech"],
        appliedAt: "2023-10-01",
      },
    );
    expect(doc.frontmatter["platform"]).toBe("LinkedIn");
    expect(doc.frontmatter["applicationStatus"]).toBe("Interview");
    expect(doc.frontmatter["salary"]).toBe("100k");
    expect(doc.frontmatter["location"]).toBe("NY");
    expect(doc.frontmatter.tags).toEqual(["fintech"]);
    expect(doc.frontmatter["appliedAt"]).toBe("2023-10-01");
  });

  // ─── Education ──────────────────────────────────────────────────────────────

  it("should create an Education document", () => {
    const doc = OKFDocumentFactory.createEducation(
      "MIT",
      "B.Sc. Computer Science",
    );

    expect(doc.frontmatter.type).toBe("Education");
    expect(doc.frontmatter.title).toBe("B.Sc. Computer Science — MIT");
    expect(doc.frontmatter["institution"]).toBe("MIT");
    expect(doc.frontmatter["degree"]).toBe("B.Sc. Computer Science");
    expect(doc.conceptId).toBe("education/mit");
    expect(doc.filePath).toBe("");
    expect(doc.body).toContain("# B.Sc. Computer Science — MIT");
  });

  it("should create an Education document with all optional fields", () => {
    const doc = OKFDocumentFactory.createEducation("MIT", "B.Sc.", {
      field: "CS",
      startDate: "2015-09",
      endDate: "2019-06",
      location: "MA",
      tags: ["cs"],
      description: "Good school",
    });
    expect(doc.frontmatter["field"]).toBe("CS");
    expect(doc.frontmatter["startDate"]).toBe("2015-09");
    expect(doc.frontmatter["endDate"]).toBe("2019-06");
    expect(doc.frontmatter["location"]).toBe("MA");
    expect(doc.frontmatter.tags).toEqual(["cs"]);
    expect(doc.frontmatter.description).toBe("Good school");
  });

  // ─── Certificate ───────────────────────────────────────────────────────────

  it("should create a Certificate document", () => {
    const doc = OKFDocumentFactory.createCertificate(
      "AWS Solutions Architect",
      "Amazon Web Services",
    );

    expect(doc.frontmatter.type).toBe("Certificate");
    expect(doc.frontmatter.title).toBe("AWS Solutions Architect");
    expect(doc.frontmatter["issuer"]).toBe("Amazon Web Services");
    expect(doc.conceptId).toBe("certificates/aws-solutions-architect");
    expect(doc.filePath).toBe("");
    expect(doc.body).toContain("Issued by Amazon Web Services");
  });

  it("should create a Certificate document with all optional fields", () => {
    const doc = OKFDocumentFactory.createCertificate("AWS", "Amazon", {
      dateObtained: "2020",
      expirationDate: "2023",
      credentialId: "123",
      url: "http://aws",
      tags: ["cloud"],
      description: "Cloud cert",
    });
    expect(doc.frontmatter["dateObtained"]).toBe("2020");
    expect(doc.frontmatter["expirationDate"]).toBe("2023");
    expect(doc.frontmatter["credentialId"]).toBe("123");
    expect(doc.frontmatter["url"]).toBe("http://aws");
    expect(doc.frontmatter.tags).toEqual(["cloud"]);
    expect(doc.frontmatter.description).toBe("Cloud cert");
    expect(doc.body).toContain("Credential ID: 123");
  });

  // ─── Project ────────────────────────────────────────────────────────────────

  it("should create a Project document", () => {
    const doc = OKFDocumentFactory.createProject("Career Orchestrator");

    expect(doc.frontmatter.type).toBe("Project");
    expect(doc.frontmatter.title).toBe("Career Orchestrator");
    expect(doc.conceptId).toBe("projects/career-orchestrator");
    expect(doc.filePath).toBe("");
    expect(doc.body).toContain("# Career Orchestrator");
  });

  it("should create a Project document with all optional fields", () => {
    const doc = OKFDocumentFactory.createProject("Proj", {
      url: "http://proj",
      technologies: ["TS"],
      startDate: "2021",
      endDate: "2022",
      tags: ["oss"],
      description: "My proj",
    });
    expect(doc.frontmatter["url"]).toBe("http://proj");
    expect(doc.frontmatter["technologies"]).toEqual(["TS"]);
    expect(doc.frontmatter["startDate"]).toBe("2021");
    expect(doc.frontmatter["endDate"]).toBe("2022");
    expect(doc.frontmatter.tags).toEqual(["oss"]);
    expect(doc.frontmatter.description).toBe("My proj");
  });

  // ─── Preference ─────────────────────────────────────────────────────────────

  it("should create a Preference document", () => {
    const doc = OKFDocumentFactory.createPreference({
      remote: true,
      locations: ["San Francisco", "Remote"],
    });

    expect(doc.frontmatter.type).toBe("Preference");
    expect(doc.frontmatter.title).toBe("Job Search Preferences");
    expect(doc.frontmatter["remote"]).toBe(true);
    expect(doc.frontmatter["locations"]).toEqual(["San Francisco", "Remote"]);
    expect(doc.conceptId).toBe("preferences/job-search");
    expect(doc.filePath).toBe("");
  });

  it("should create a Preference document with all optional fields", () => {
    const doc = OKFDocumentFactory.createPreference({
      title: "My Prefs",
      locations: ["SF"],
      remote: true,
      salaryRange: "100-200",
      roles: ["Dev"],
      companySize: "10+",
      tags: ["pref"],
      description: "Desc",
    });
    expect(doc.frontmatter.title).toBe("My Prefs");
    expect(doc.frontmatter["locations"]).toEqual(["SF"]);
    expect(doc.frontmatter["remote"]).toBe(true);
    expect(doc.frontmatter["salaryRange"]).toBe("100-200");
    expect(doc.frontmatter["roles"]).toEqual(["Dev"]);
    expect(doc.frontmatter["companySize"]).toBe("10+");
    expect(doc.frontmatter.tags).toEqual(["pref"]);
    expect(doc.frontmatter.description).toBe("Desc");
  });

  // ─── Slugification ─────────────────────────────────────────────────────────

  it("should slugify names correctly", () => {
    const cases = [
      { input: "Hello World", expected: "skills/hello-world" },
      { input: "C++ Programming", expected: "skills/c-programming" },
      { input: "  Leading Spaces  ", expected: "skills/leading-spaces" },
      { input: "Multi   Spaces", expected: "skills/multi-spaces" },
      { input: "Special!@#Chars", expected: "skills/specialchars" },
      { input: "UPPER CASE", expected: "skills/upper-case" },
      { input: "already-slugified", expected: "skills/already-slugified" },
    ];

    for (const { input, expected } of cases) {
      const doc = OKFDocumentFactory.createSkill(input);
      expect(doc.conceptId).toBe(expected);
    }
  });

  // ─── Timestamp ──────────────────────────────────────────────────────────────

  it("should set timestamp to ISO 8601 format", () => {
    const before = new Date().toISOString();
    const doc = OKFDocumentFactory.createSkill("Test");
    const after = new Date().toISOString();

    const timestamp = doc.frontmatter.timestamp as string;

    // Verify ISO 8601 format
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    // Verify the timestamp is within the before/after window
    expect(new Date(timestamp).getTime()).toBeGreaterThanOrEqual(
      new Date(before).getTime(),
    );
    expect(new Date(timestamp).getTime()).toBeLessThanOrEqual(
      new Date(after).getTime(),
    );
  });

  // ─── Optional Fields ───────────────────────────────────────────────────────

  it("should include optional fields when provided", () => {
    const doc = OKFDocumentFactory.createSkill("React", {
      level: "Expert",
      yearsOfExperience: 7,
      category: "Frontend Frameworks",
      tags: ["frontend", "ui", "javascript"],
      description: "Expert-level React developer",
    });

    expect(doc.frontmatter["level"]).toBe("Expert");
    expect(doc.frontmatter["yearsOfExperience"]).toBe(7);
    expect(doc.frontmatter["category"]).toBe("Frontend Frameworks");
    expect(doc.frontmatter.tags).toEqual(["frontend", "ui", "javascript"]);
    expect(doc.frontmatter.description).toBe("Expert-level React developer");
    expect(doc.body).toContain("Expert-level React developer");
  });
});
