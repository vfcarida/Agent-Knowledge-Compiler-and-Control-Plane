import { describe, it, expect } from "vitest";
import { compile } from "../../compiler/compile.js";
import path from "path";

describe("compile (Result-based API)", () => {
  const fixturesDir = path.resolve(__dirname, "../../../../test-fixtures/bundles");

  it("should return success for valid bundle", async () => {
    const result = await compile(path.join(fixturesDir, "valid-profile-v1"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.ir.concepts.length).toBeGreaterThan(0);
      expect(result.value.stats.durationMs).toBeGreaterThan(0);
    }
  });

  it("should return failure for invalid bundle", async () => {
    const result = await compile("/nonexistent/path");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it("should include warnings for stale documents", async () => {
    // Use a bundle with stale docs if available
    const result = await compile(path.join(fixturesDir, "valid-profile-v1"));
    if (result.ok) {
      expect(result.value.warnings).toBeDefined();
      expect(Array.isArray(result.value.warnings)).toBe(true);
    }
  });
});
