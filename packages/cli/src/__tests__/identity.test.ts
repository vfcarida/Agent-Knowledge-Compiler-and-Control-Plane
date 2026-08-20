import { test, expect } from "vitest";
import { execSync } from "child_process";
import path from "path";

test("akcp CLI is the main binary", () => {
  const cliPath = path.resolve(__dirname, "../../dist/index.js");

  // Running the CLI without args should show the help menu
  const output = execSync(`node ${cliPath} --help`).toString();

  // Should mention AKCP
  expect(output).toContain("AKCP");

  // Should NOT mention Open Career Format
  expect(output).not.toContain("Open Career Format");
});

test("doctor returns AKCP Diagnostics", () => {
  const cliPath = path.resolve(__dirname, "../../dist/index.js");

  // Running doctor
  const output = execSync(`node ${cliPath} doctor`).toString();

  expect(output).toContain("Running AKCP Diagnostics...");
});
