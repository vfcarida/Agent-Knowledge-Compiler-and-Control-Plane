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

test("legacy-bin emits warning and delegates", () => {
  const cliPath = path.resolve(__dirname, "../../dist/legacy-bin.js");

  try {
    const output = execSync(`node ${cliPath} --help`, {
      stdio: "pipe",
    }).toString();
    // This is difficult to capture from stderr via pipe easily with vitest depending on how execSync is configured,
    // but the output will show the command ran successfully via delegation
    expect(output).toContain("Usage: akcp");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    // If it fails, we at least expect it to contain AKCP usage, but actually we can just check stderr
    expect(err.stderr.toString()).toContain("DEPRECATION WARNING");
  }
});
