/**
 * @module __tests__/frontmatter-parser.test
 * @description Unit tests for the FrontmatterParser infrastructure component.
 *
 * FrontmatterParser is a pure function-like class with no external dependencies
 * beyond `gray-matter`, so no mocking is needed. Tests cover:
 * - Happy-path parsing with full and minimal frontmatter
 * - Validation errors for missing/empty `type` fields
 * - Parse errors for malformed YAML
 * - ConceptId derivation from file paths
 * - Roundtrip parse ↔ serialize fidelity
 * - Passthrough of extra frontmatter fields
 */

import { describe, it, expect } from "vitest";

import { FrontmatterParser } from "../infrastructure/frontmatter-parser.js";
import { OKFValidationError, OKFParseError } from "../domain/errors.js";

const parser = new FrontmatterParser();
const BUNDLE_ROOT = "/home/user/career-bundle";

describe("FrontmatterParser", () => {
  // ─── Parsing ────────────────────────────────────────────────────────────────

  it("should parse valid OKF document with all fields", () => {
    const rawContent = [
      "---",
      "type: Skill",
      "title: TypeScript",
      "description: Strongly-typed JavaScript superset",
      "resource: https://typescriptlang.org",
      "tags:",
      "  - programming",
      "  - frontend",
      'timestamp: "2025-01-15T10:30:00Z"',
      "level: Advanced",
      "yearsOfExperience: 5",
      "category: Programming Languages",
      "---",
      "",
      "# TypeScript",
      "",
      "Detailed notes about TypeScript proficiency.",
    ].join("\n");

    const doc = parser.parse(
      rawContent,
      `${BUNDLE_ROOT}/skills/typescript.md`,
      BUNDLE_ROOT,
    );

    expect(doc.frontmatter.type).toBe("Skill");
    expect(doc.frontmatter.title).toBe("TypeScript");
    expect(doc.frontmatter.description).toBe(
      "Strongly-typed JavaScript superset",
    );
    expect(doc.frontmatter.resource).toBe("https://typescriptlang.org");
    expect(doc.frontmatter.tags).toEqual(["programming", "frontend"]);
    expect(doc.frontmatter.timestamp).toBe("2025-01-15T10:30:00Z");
    expect(doc.frontmatter["level"]).toBe("Advanced");
    expect(doc.frontmatter["yearsOfExperience"]).toBe(5);
    expect(doc.frontmatter["category"]).toBe("Programming Languages");
    expect(doc.body).toContain("# TypeScript");
    expect(doc.body).toContain("Detailed notes about TypeScript proficiency.");
    expect(doc.conceptId).toBe("skills/typescript");
    expect(doc.filePath).toBe(`${BUNDLE_ROOT}/skills/typescript.md`);
  });

  it("should parse document with only required type field", () => {
    const rawContent = [
      "---",
      "type: Skill",
      "---",
      "",
      "Minimal content.",
    ].join("\n");

    const doc = parser.parse(
      rawContent,
      `${BUNDLE_ROOT}/skills/minimal.md`,
      BUNDLE_ROOT,
    );

    expect(doc.frontmatter.type).toBe("Skill");
    expect(doc.frontmatter.title).toBeUndefined();
    expect(doc.frontmatter.tags).toBeUndefined();
    expect(doc.body).toBe("Minimal content.");
    expect(doc.conceptId).toBe("skills/minimal");
  });

  // ─── Validation Errors ──────────────────────────────────────────────────────

  it("should throw OKFValidationError when type field is missing", () => {
    const rawContent = ["---", "title: No Type", "---", "", "Body text."].join(
      "\n",
    );

    expect(() =>
      parser.parse(rawContent, `${BUNDLE_ROOT}/bad.md`, BUNDLE_ROOT),
    ).toThrow(OKFValidationError);
  });

  it("should throw OKFValidationError when type field is empty", () => {
    const rawContent = ["---", 'type: ""', "---", "", "Body text."].join("\n");

    expect(() =>
      parser.parse(rawContent, `${BUNDLE_ROOT}/bad.md`, BUNDLE_ROOT),
    ).toThrow(OKFValidationError);
  });

  // ─── Parse Errors ──────────────────────────────────────────────────────────

  it("should throw OKFParseError for malformed YAML", () => {
    const rawContent = [
      "---",
      "type: Skill",
      "bad_yaml: [unclosed bracket",
      "---",
      "",
      "Body text.",
    ].join("\n");

    expect(() =>
      parser.parse(rawContent, `${BUNDLE_ROOT}/bad.md`, BUNDLE_ROOT),
    ).toThrow(OKFParseError);
  });

  // ─── Concept ID Derivation ─────────────────────────────────────────────────

  it("should correctly derive conceptId from file path", () => {
    const rawContent = ["---", "type: Experience", "---", "", "Content."].join(
      "\n",
    );

    const doc = parser.parse(
      rawContent,
      `${BUNDLE_ROOT}/experiences/acme-corp-engineer.md`,
      BUNDLE_ROOT,
    );

    expect(doc.conceptId).toBe("experiences/acme-corp-engineer");
  });

  it("should normalize Windows path separators in conceptId", () => {
    const rawContent = ["---", "type: Skill", "---", "", "Content."].join("\n");

    // Simulate a Windows-style bundle root and file path
    const winBundleRoot = "C:\\Users\\dev\\career-bundle";
    const winFilePath = "C:\\Users\\dev\\career-bundle\\skills\\python.md";

    const doc = parser.parse(rawContent, winFilePath, winBundleRoot);

    expect(doc.conceptId).toBe("skills/python");
  });

  // ─── Serialization ─────────────────────────────────────────────────────────

  it("should serialize document back to markdown string", () => {
    const frontmatter = {
      type: "Skill",
      title: "Rust",
      tags: ["systems", "performance"],
    };
    const body = "# Rust\n\nSystems programming language.";

    const result = parser.serialize(frontmatter, body);

    expect(result).toContain("---");
    expect(result).toContain("type: Skill");
    expect(result).toContain("title: Rust");
    expect(result).toContain("# Rust");
    expect(result).toContain("Systems programming language.");
  });

  // ─── Roundtrip ──────────────────────────────────────────────────────────────

  it("should roundtrip parse and serialize", () => {
    const original = [
      "---",
      "type: Project",
      "title: Career Orchestrator",
      "tags:",
      "  - open-source",
      "  - typescript",
      "---",
      "",
      "# Career Orchestrator",
      "",
      "An open-source career management tool.",
    ].join("\n");

    const doc = parser.parse(
      original,
      `${BUNDLE_ROOT}/projects/career-orchestrator.md`,
      BUNDLE_ROOT,
    );

    const serialized = parser.serialize(doc.frontmatter, doc.body);
    const reparsed = parser.parse(
      serialized,
      `${BUNDLE_ROOT}/projects/career-orchestrator.md`,
      BUNDLE_ROOT,
    );

    expect(reparsed.frontmatter.type).toBe(doc.frontmatter.type);
    expect(reparsed.frontmatter.title).toBe(doc.frontmatter.title);
    expect(reparsed.frontmatter.tags).toEqual(doc.frontmatter.tags);
    expect(reparsed.body).toBe(doc.body);
    expect(reparsed.conceptId).toBe(doc.conceptId);
  });

  // ─── Passthrough ────────────────────────────────────────────────────────────

  it("should preserve extra frontmatter fields (passthrough test)", () => {
    const rawContent = [
      "---",
      "type: Skill",
      "title: GraphQL",
      "customField: custom-value",
      "nested:",
      "  key: value",
      "---",
      "",
      "Body.",
    ].join("\n");

    const doc = parser.parse(
      rawContent,
      `${BUNDLE_ROOT}/skills/graphql.md`,
      BUNDLE_ROOT,
    );

    expect(doc.frontmatter["customField"]).toBe("custom-value");
    expect(doc.frontmatter["nested"]).toEqual({ key: "value" });
  });
});
