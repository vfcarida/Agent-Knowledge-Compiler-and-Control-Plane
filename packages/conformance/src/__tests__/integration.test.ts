import { describe, it, expect } from "vitest";
import { ConformanceRunner } from "../runner";
import { buildKnowledgeIR } from "@akcp/core";

describe("AKCP Workspace Integration", () => {
  it("should successfully resolve imports from @akcp/core inside @akcp/conformance", () => {
    // This test ensures that the path mapping in tsconfig.base.json
    // and the package.json configurations correctly allow cross-package
    // resolution using the @akcp namespace.
    expect(buildKnowledgeIR).toBeDefined();
    expect(typeof buildKnowledgeIR).toBe("function");

    const runner = new ConformanceRunner();
    expect(runner).toBeDefined();
    expect(typeof runner.run).toBe("function");
  });
});
