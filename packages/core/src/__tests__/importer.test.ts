import { describe, it, expect, vi } from "vitest";
import path from "node:path";
import { importSource } from "../integrations/importer.js";
import fs from "node:fs";

describe("Source Importers", () => {
  const fixturesDir = path.resolve(process.cwd(), "../test-fixtures");

  describe("OpenWiki Adapter", () => {
    it("detects and imports openwiki basic", async () => {
      const inputDir = path.join(fixturesDir, "openwiki", "basic");
      const outputDir = path.join(fixturesDir, "out-openwiki-basic");

      const report = await importSource("openwiki", inputDir, outputDir, true); // dry run
      expect(report.ok).toBe(true);
      expect(report.documentsImported).toBe(1);
      expect(report.diagnostics.length).toBeGreaterThan(0);
      expect(report.provenance.length).toBe(1);
      expect(report.provenance[0].sourceType).toBe("openwiki");
    });

    it("detects and imports openwiki with frontmatter", async () => {
      const inputDir = path.join(fixturesDir, "openwiki", "with-frontmatter");
      const outputDir = path.join(fixturesDir, "out-openwiki-frontmatter");

      const report = await importSource("openwiki", inputDir, outputDir, true);
      expect(report.ok).toBe(true);
      expect(report.documentsImported).toBe(1);
    });
  });

  describe("OKF Adapter", () => {
    it("detects and imports valid OKF basic", async () => {
      const inputDir = path.join(fixturesDir, "okf", "valid-basic");
      const outputDir = path.join(fixturesDir, "out-okf-basic");

      const report = await importSource("okf", inputDir, outputDir, true);
      expect(report.ok).toBe(true);
      expect(report.documentsImported).toBe(1);
      expect(report.provenance[0].sourceType).toBe("okf");
    });

    it("tolerates unknown OKF types", async () => {
      const inputDir = path.join(fixturesDir, "okf", "unknown-types");
      const outputDir = path.join(fixturesDir, "out-okf-unknown-types");

      const report = await importSource("okf", inputDir, outputDir, true);
      expect(report.ok).toBe(true);
      expect(report.documentsImported).toBe(1);
    });

    it("preserves unknown OKF keys", async () => {
      const inputDir = path.join(fixturesDir, "okf", "unknown-keys");
      const outputDir = path.join(fixturesDir, "out-okf-unknown-keys");

      const report = await importSource("okf", inputDir, outputDir, true);
      expect(report.ok).toBe(true);
      expect(report.documentsImported).toBe(1);
    });
  });
});
