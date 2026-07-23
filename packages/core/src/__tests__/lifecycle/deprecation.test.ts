import { describe, it, expect } from "vitest";
import { Deprecation } from "../../lifecycle/deprecation.js";
import type { OKFDocument } from "../../domain/types.js";

describe("Lifecycle Deprecation", () => {
  const createMockDoc = (
    id: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status?: any,
    successor?: string,
  ): OKFDocument => ({
    conceptId: id,
    frontmatter: { status, successor },
    body: "",
    filePath: `/${id}.md`,
  });

  it("should return null if the document is not deprecated", () => {
    const doc = createMockDoc("doc-1", "active");
    const map = new Map([["doc-1", doc]]);
    expect(Deprecation.resolveUltimateSuccessor(doc, map)).toBeNull();
  });

  it("should return null if deprecated but no successor is defined", () => {
    const doc = createMockDoc("doc-1", "deprecated");
    const map = new Map([["doc-1", doc]]);
    expect(Deprecation.resolveUltimateSuccessor(doc, map)).toBeNull();
  });

  it("should resolve the immediate successor if it is active", () => {
    const doc1 = createMockDoc("doc-1", "deprecated", "doc-2");
    const doc2 = createMockDoc("doc-2", "active");
    const map = new Map([
      ["doc-1", doc1],
      ["doc-2", doc2],
    ]);

    expect(Deprecation.resolveUltimateSuccessor(doc1, map)).toBe("doc-2");
  });

  it("should resolve a chain of successors", () => {
    const doc1 = createMockDoc("doc-1", "deprecated", "doc-2");
    const doc2 = createMockDoc("doc-2", "deprecated", "doc-3");
    const doc3 = createMockDoc("doc-3", "active");
    const map = new Map([
      ["doc-1", doc1],
      ["doc-2", doc2],
      ["doc-3", doc3],
    ]);

    expect(Deprecation.resolveUltimateSuccessor(doc1, map)).toBe("doc-3");
  });

  it("should detect cycles and return null to prevent infinite loops", () => {
    const doc1 = createMockDoc("doc-1", "deprecated", "doc-2");
    const doc2 = createMockDoc("doc-2", "deprecated", "doc-1");
    const map = new Map([
      ["doc-1", doc1],
      ["doc-2", doc2],
    ]);

    expect(Deprecation.resolveUltimateSuccessor(doc1, map)).toBeNull();
  });
});
