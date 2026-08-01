import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { detectSourceOkfVersion } from "../../infrastructure/okf-version.js";

describe("detectSourceOkfVersion", () => {
  const testDir = path.resolve(process.cwd(), "dist/test-okf-version");

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("returns the declared okf_version from root index.md", () => {
    fs.writeFileSync(
      path.join(testDir, "index.md"),
      '---\nokf_version: "0.2"\n---\n\n# Bundle Index\n',
    );
    expect(detectSourceOkfVersion(testDir)).toBe("0.2");
  });

  it("returns undefined when there is no root index.md", () => {
    expect(detectSourceOkfVersion(testDir)).toBeUndefined();
  });

  it("returns undefined when index.md declares no okf_version (a valid OKF v0.2 bundle)", () => {
    fs.writeFileSync(
      path.join(testDir, "index.md"),
      "# Bundle Index\n\nNo frontmatter here.\n",
    );
    expect(detectSourceOkfVersion(testDir)).toBeUndefined();
  });

  it("returns undefined instead of throwing on malformed frontmatter", () => {
    fs.writeFileSync(
      path.join(testDir, "index.md"),
      "---\nokf_version: [unterminated\n---\n",
    );
    expect(detectSourceOkfVersion(testDir)).toBeUndefined();
  });
});
