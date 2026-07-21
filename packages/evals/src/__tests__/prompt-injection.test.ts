import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Prompt Injection Dataset", () => {
  const datasetPath = path.resolve(
    __dirname,
    "../prompt-injection-dataset.json",
  );

  it("should have a valid dataset file", () => {
    expect(fs.existsSync(datasetPath)).toBe(true);
  });

  it("should contain properly structured scenarios", () => {
    const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));
    expect(Array.isArray(dataset)).toBe(true);
    expect(dataset.length).toBeGreaterThan(0);

    for (const item of dataset) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("type");
      expect(item).toHaveProperty("payload");
      expect(item).toHaveProperty("expectedBehavior");
      expect(typeof item.payload).toBe("string");
      expect(item.payload.length).toBeGreaterThan(0);
    }
  });

  it("should cover multiple injection types", () => {
    const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));
    const types = new Set(dataset.map((d: unknown) => d.type));
    expect(types.size).toBeGreaterThan(1); // At least 2 different types
  });
});
