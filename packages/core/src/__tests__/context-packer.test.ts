import { describe, it, expect } from "vitest";
import { ContextPacker } from "../services/context-packer.js";
import type { OKFDocument } from "../domain/types.js";

describe("ContextPacker", () => {
  it("packs documents based on mode minimal", () => {
    const packer = new ContextPacker();
    const docs: OKFDocument[] = [
      {
        conceptId: "doc-1",
        version: "1.0",
        formatVersion: "0.1",
        frontmatter: { title: "Doc 1" },
        body: "Long body of doc 1 goes here",
        filePath: "doc-1.md",
      },
    ];

    const result = packer.pack(docs, {
      profile: "test-profile",
      mode: "minimal",
    });

    expect(result.documents.length).toBe(1);
    expect(result.documents[0].excerpt).toContain("Doc 1");
    expect(result.documents[0].excerpt).not.toContain("Long body");
    expect(result.omitted.length).toBe(0);
  });

  it("packs documents based on mode balanced", () => {
    const packer = new ContextPacker();
    const docs: OKFDocument[] = [
      {
        conceptId: "doc-1",
        version: "1.0",
        formatVersion: "0.1",
        frontmatter: { title: "Doc 1" },
        body: "a".repeat(600),
        filePath: "doc-1.md",
      },
    ];

    const result = packer.pack(docs, {
      profile: "test-profile",
      mode: "balanced",
    });

    expect(result.documents.length).toBe(1);
    expect(result.documents[0].excerpt).toContain("[TRUNCATED]");
  });

  it("redacts PII based on policy", () => {
    const packer = new ContextPacker({
      id: "p1",
      name: "Policy 1",
      rules: [],
      piiHandling: "redact",
    });
    const docs: OKFDocument[] = [
      {
        conceptId: "doc-1",
        version: "1.0",
        formatVersion: "0.1",
        frontmatter: { title: "Doc 1", email: "test@example.com" },
        body: "Contact: test@example.com and +1-555-1234",
        filePath: "doc-1.md",
      },
    ];

    const result = packer.pack(docs, {
      profile: "test-profile",
      mode: "full",
    });

    expect(result.documents[0].excerpt).toContain("[REDACTED_EMAIL]");
    expect(result.documents[0].excerpt).toContain("[REDACTED_PHONE]");
  });

  it("denies PII based on policy", () => {
    const packer = new ContextPacker({
      id: "p1",
      name: "Policy 1",
      rules: [],
      piiHandling: "deny",
    });
    const docs: OKFDocument[] = [
      {
        conceptId: "doc-1",
        version: "1.0",
        formatVersion: "0.1",
        frontmatter: { title: "Doc 1", email: "test@example.com" },
        body: "Body",
        filePath: "doc-1.md",
      },
    ];

    const result = packer.pack(docs, {
      profile: "test-profile",
      mode: "full",
    });

    expect(result.documents.length).toBe(0);
    expect(result.omitted.length).toBe(1);
    expect(result.omitted[0].reason).toContain("Deny");
  });
});
