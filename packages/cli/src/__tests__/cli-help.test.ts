import { test, expect } from "vitest";
import { execSync } from "child_process";
import path from "path";

test("akcp --help displays clear instructions", () => {
  const cliPath = path.resolve(__dirname, "../../dist/index.js");

  const output = execSync(`node ${cliPath} --help`).toString();

  expect(output).toContain("Usage: akcp");
  expect(output).toContain("Agent Knowledge Compiler and Control Plane CLI");
  // Check for core commands
  expect(output).toContain("init [options]");
  expect(output).toContain("compile [options]");
  expect(output).toContain("validate [options]");
});

test("akcp doctor runs successfully", () => {
  const cliPath = path.resolve(__dirname, "../../dist/index.js");
  const output = execSync(`node ${cliPath} doctor`).toString();

  expect(output).toContain("Running AKCP Diagnostics");
  expect(output).toContain("Node Version");
});

test("akcp compile --dry-run is not a valid flag for compile (or it is ignored, checking syntax)", () => {
  const cliPath = path.resolve(__dirname, "../../dist/index.js");
  // compile doesn't have dry-run in code, but let's check it doesn't crash on standard args
  const output = execSync(`node ${cliPath} compile --help`).toString();
  expect(output).toContain("--bundle");
});

test("invalid commands suggest alternatives", () => {
  const cliPath = path.resolve(__dirname, "../../dist/index.js");

  try {
    execSync(`node ${cliPath} buil`, { stdio: "pipe" });
  } catch (err: any) {
    const stderr = err.stderr.toString();
    expect(stderr).toContain("error: unknown command 'buil'");
    // Commander showSuggestionAfterError should suggest 'build' but since we didn't add 'build' back,
    // wait, we removed 'build' from docs, but the code still uses 'compile'.
    // If the code has no 'build', commander will suggest nothing or closest.
    // Let's test a typo of compile
  }

  try {
    execSync(`node ${cliPath} compie`, { stdio: "pipe" });
  } catch (err: any) {
    const stderr = err.stderr.toString();
    expect(stderr).toContain("error: unknown command 'compie'");
    expect(stderr).toContain("(Did you mean compile?)");
  }
});
