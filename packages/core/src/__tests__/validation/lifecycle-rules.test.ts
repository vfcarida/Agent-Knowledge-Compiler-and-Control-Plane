import { describe, it, expect } from "vitest";
import { LifecycleValidator } from "../../validation/lifecycle-rules.js";
import type { AgentKnowledgeIR } from "../../ir/types.js";

describe("LifecycleValidator", () => {
  it("should validate an IR with no concepts without throwing", () => {
    const ir = {
      concepts: [],
    } as unknown as AgentKnowledgeIR;

    expect(() => LifecycleValidator.validate(ir)).not.toThrow();
  });

  it("should warn if a concept is deprecated without a successor", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ir = {
      concepts: [
        {
          conceptId: "doc-1",
          status: "deprecated",
          frontmatter: {
            id: "doc-1",
          },
        },
      ],
    } as unknown as AgentKnowledgeIR;

    LifecycleValidator.validate(ir);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("has no successor defined"),
    );
    warnSpy.mockRestore();
  });

  it("should warn correctly if successor is provided", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ir = {
      concepts: [
        {
          conceptId: "doc-1",
          status: "deprecated",
          frontmatter: {
            id: "doc-1",
            successor: "doc-2",
          },
        },
        {
          conceptId: "doc-2",
          status: "active",
          frontmatter: {
            id: "doc-2",
          },
        },
      ],
    } as unknown as AgentKnowledgeIR;

    LifecycleValidator.validate(ir);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Successor: 'doc-2'"),
    );
    warnSpy.mockRestore();
  });

  it("should warn correctly for stale concepts", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ir = {
      concepts: [
        {
          conceptId: "doc-1",
          status: "stale",
          frontmatter: {},
        },
      ],
    } as unknown as AgentKnowledgeIR;

    LifecycleValidator.validate(ir);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("is marked as STALE"),
    );
    warnSpy.mockRestore();
  });

  it("should warn correctly for links pointing to stale or deprecated concepts", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ir = {
      concepts: [
        { conceptId: "doc-stale", status: "stale", frontmatter: {} },
        { conceptId: "doc-dep", status: "deprecated", frontmatter: {} },
      ],
      links: [
        {
          sourceConceptId: "doc-active-1",
          targetConceptId: "doc-stale",
          type: "related",
        },
        {
          sourceConceptId: "doc-active-2",
          targetConceptId: "doc-dep",
          type: "related",
        },
      ],
    } as unknown as AgentKnowledgeIR;

    LifecycleValidator.validate(ir);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "'doc-active-1' depends on STALE concept 'doc-stale'",
      ),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "'doc-active-2' depends on DEPRECATED concept 'doc-dep'",
      ),
    );
    warnSpy.mockRestore();
  });
});
