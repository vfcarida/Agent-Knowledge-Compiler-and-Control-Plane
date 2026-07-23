import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";

console.log("=== AKCP Pre-Release Check ===\n");

let errors = 0;

function run(command) {
  try {
    execSync(command, { stdio: "inherit" });
    return true;
  } catch (err) {
    return false;
  }
}

// 1. Clean build
console.log("[1/8] Clean build...");
if (!run("pnpm run clean")) {
  console.log("FAIL: Clean failed");
  errors++;
}
if (!run("pnpm build")) {
  console.log("FAIL: Build failed");
  errors++;
}

// 2. All tests pass
console.log("[2/8] Running tests...");
if (!run("pnpm test -- --run")) {
  console.log("FAIL: Tests failed");
  errors++;
}

// 3. No legacy namespace references in source
console.log("[3/8] Checking for legacy namespaces...");
let legacyFound = false;
const coreTsFiles = globSync("packages/*/src/**/*.ts", { ignore: ["**/node_modules/**", "**/*.test.*"] });
for (const file of coreTsFiles) {
  const content = fs.readFileSync(file, "utf8");
  if (/@ocf|OCF_|OcfBundle|OCFMcp/.test(content)) {
    console.log(`FAIL: Legacy namespace found in ${file}`);
    legacyFound = true;
  }
}
if (legacyFound) errors++;

// 4. No unpinned actions
console.log("[4/8] Checking GitHub Actions pinning...");
const workflowFiles = globSync(".github/workflows/*.yml");
for (const file of workflowFiles) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("uses:") && /@v[0-9]|@latest|@main|@master/.test(line)) {
      console.log(`WARN: Unpinned action found in ${file}:${i + 1} -> ${line.trim()}`);
    }
  }
}

// 5. CLI smoke test
console.log("[5/8] CLI smoke test...");
const cliPath = path.join("packages", "cli", "dist", "index.js");
if (fs.existsSync(cliPath)) {
  if (!run(`node ${cliPath} --help > ${process.platform === 'win32' ? 'NUL' : '/dev/null'} 2>&1`)) {
    console.log("FAIL: CLI --help failed");
    errors++;
  }
} else {
  console.log(`WARN: CLI not built at ${cliPath}`);
}

// 6. Package exports resolve
console.log("[6/8] Checking package exports...");
const packages = ["packages/core", "packages/cli", "packages/conformance", "packages/mcp-profile-server"];
for (const pkg of packages) {
  const pkgJsonPath = path.join(pkg, "package.json");
  if (fs.existsSync(pkgJsonPath)) {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    const main = pkgJson.main || pkgJson.exports?.["."]?.import || "NONE";
    if (main === "NONE") {
      console.log(`WARN: ${pkg} has no main/exports entry`);
    } else {
      const mainPath = path.join(pkg, main);
      const jsMainPath = mainPath.replace(/\.js$/, ".js");
      if (!fs.existsSync(mainPath) && !fs.existsSync(jsMainPath)) {
        console.log(`WARN: ${pkg} main entry '${main}' may not exist after build`);
      }
    }
  }
}

// 7. No stale artifacts in root
console.log("[7/8] Checking for stale root artifacts...");
const staleFiles = [
  "lint-results.json",
  "pnpm-lock.yaml.1147000961",
  "debug-conformance.ts"
];
for (const stale of staleFiles) {
  if (fs.existsSync(stale)) {
    console.log(`WARN: Stale artifact found: ${stale}`);
  }
}
if (fs.existsSync("scratch") && fs.statSync("scratch").isDirectory()) {
  console.log("WARN: Stale directory found: scratch/");
}

// 8. TypeScript strict (no any casts in core)
console.log("[8/8] Checking for 'as any' in core...");
const coreSrcFiles = globSync("packages/core/src/**/*.ts", { ignore: ["**/node_modules/**", "**/*.test.*"] });
for (const file of coreSrcFiles) {
  const content = fs.readFileSync(file, "utf8");
  if (content.includes("as any")) {
    console.log(`WARN: 'as any' casts in core (consider fixing): ${file}`);
  }
}

console.log("\n=== Results ===");
if (errors === 0) {
  console.log("ALL CHECKS PASSED — ready for v0.1.0 tag");
  process.exit(0);
} else {
  console.log(`FAILED: ${errors} critical check(s) failed`);
  process.exit(1);
}
