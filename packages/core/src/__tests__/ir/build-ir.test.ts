import { describe, it, expect } from "vitest";
import path from "path";
import { buildKnowledgeIR } from "../../ir/build-ir.js";
import { AgentKnowledgeIRSchema } from "../../ir/schema.js";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("buildKnowledgeIR", () => {
  const sampleBundlePath = path.resolve(
    __dirname,
    "../../../../../examples/domains/career",
  );

  it("should compile career domain into valid IR", async () => {
    const ir = await buildKnowledgeIR(sampleBundlePath, {
      bundleId: "test-bundle",
    });

    // Ensure it conforms to the schema
    const parsed = AgentKnowledgeIRSchema.parse(ir);

    expect(parsed.irVersion).toBe("1.0.0");
    expect(parsed.bundleId).toBe("test-bundle");
    expect(parsed.concepts.length).toBeGreaterThan(0);

    // Verify budget calculation
    const firstConcept = parsed.concepts[0];
    expect(firstConcept).toBeDefined();
    expect(firstConcept?.budget.byteSize).toBeGreaterThan(0);
    expect(firstConcept?.budget.estimatedTokens).toBeGreaterThan(0);

    // Verify source
    expect(firstConcept?.source.format).toBe("okf/markdown");

    // Verify frontmatter was preserved and is a non-empty object (field names vary per domain)
    expect(firstConcept?.frontmatter).toBeDefined();
    expect(typeof firstConcept?.frontmatter).toBe("object");
    expect(Object.keys(firstConcept?.frontmatter ?? {})).not.toHaveLength(0);
  });
});
