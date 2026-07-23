import { describe, it, expect } from "vitest";
import { loadAkcpConfig } from "../../config/load-akcp-config.js";
import { generateBuildPlan } from "../../planner/build-plan.js";
import { reconcile } from "../../reconcile/reconcile.js";
import path from "path";
import fs from "fs";
import os from "os";

describe("AKCP Config & Planner", () => {
  const validYaml = `
compile:
  sources:
    - path: "./packages/test-fixtures/sample-data/.okf"
  targets:
    - type: context-pack
      out: "./dist/context-pack.json"
controlPlane:
  policies:
    disableDangerousTools: true
`;

  const invalidYaml = `
compile:
  targets:
    - type: context-pack
      out: "./dist/context-pack.json"
`; // missing sources

  it("should load and validate a valid configuration", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "akcp-"));
    const filePath = path.join(tmpDir, "valid.yaml");
    fs.writeFileSync(filePath, validYaml);

    const config = loadAkcpConfig(filePath);
    expect(config.compile.sources[0].path).toBe("./packages/test-fixtures/sample-data/.okf");
    expect(config.compile.targets[0].out).toBe("./dist/context-pack.json");
    expect(config.controlPlane?.policies?.disableDangerousTools).toBe(true);

    // Test planner
    const plan = generateBuildPlan(config);
    expect(plan.sourcesToRead[0]).toBe("./packages/test-fixtures/sample-data/.okf");
    expect(plan.targetsToGenerate[0]).toContain("./dist/context-pack.json");
    expect(plan.activePolicies).toContain("disableDangerousTools");
  });

  it("should throw an error for invalid configuration", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "akcp-"));
    const filePath = path.join(tmpDir, "invalid.yaml");
    fs.writeFileSync(filePath, invalidYaml);

    expect(() => loadAkcpConfig(filePath)).toThrow(
      /Configuration validation failed/,
    );
  });

  it("should report out-of-sync when sources are missing during dry-run", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "akcp-"));
    const filePath = path.join(tmpDir, "reconcile.yaml");
    fs.writeFileSync(
      filePath,
      `
compile:
  sources:
    - path: "./does-not-exist-dir-123"
  targets:
    - type: context-pack
      out: "./does-not-exist-either.json"
`,
    );

    const config = loadAkcpConfig(filePath);
    const result = await reconcile(config, { dryRun: true });

    expect(result.status).toBe("out-of-sync");
    expect(result.differences.length).toBeGreaterThan(0);
    expect(result.differences[0]).toMatch(/Source missing/);
  });
});
