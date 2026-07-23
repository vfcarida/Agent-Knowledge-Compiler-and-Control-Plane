import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceRoot = path.resolve(__dirname, "..");
const allowlistPath = path.join(workspaceRoot, "quality", "identity-allowlist.txt");

let allowlist = [];
if (fs.existsSync(allowlistPath)) {
  allowlist = fs
    .readFileSync(allowlistPath, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

// Check if a file/line combination is in the allowlist
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
function shouldCheckFile(filePath) {
  if (filePath.includes('node_modules') || filePath.includes('.git') || filePath.includes('dist')) return false;
  if (filePath.includes('quality/identity-allowlist.txt')) return false;
  if (filePath.includes('scratch/') || filePath.includes('__snapshots__') || filePath.includes('identity.test.ts')) return false;
  
  // Only check text-based files
  return /\.(md|ts|js|json|yml|yaml|txt)$/.test(filePath);
}

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
function isAllowlisted(filePath, lineContent) {
  // Simple check: if the file path is explicitly allowed
  if (allowlist.includes(filePath)) return true;
  // If a substring is allowed
  for (const allowed of allowlist) {
    if (filePath.includes(allowed)) return true;
  }
  return false;
}

const FORBIDDEN_REGEX = "(Open Career Format|OCF|Open-Career-Format|Agent-ready|Agent-ready Knowledge|Reference Architecture|ContextOps|open-career|agent-ready|@ocf|ocf-|ocf_|OPEN_CAREER|OPENCAREER)";
// We can use git grep for speed since it respects .gitignore
const result = spawnSync(
  "git",
  [
    "grep",
    "-E",
    "-n",
    "-I",
    FORBIDDEN_REGEX,
    "--",
    ":(exclude)quality/identity-allowlist.txt",
    ":(exclude)scripts/*",
    ":(exclude)scratch/*",
    ":(exclude)packages/cli/src/__tests__/__snapshots__/*",
    ":(exclude)packages/cli/src/__tests__/identity.test.ts",
    ":(exclude)**/.akcp/*",
    ":(exclude)package.json",
    ":(exclude)packages/cli/package.json",
    ":(exclude)packages/cli/src/legacy-bin.ts",
    ":(exclude)packages/cli/src/legacy-ocf-bin.ts",
    ":(exclude)**/expected-output/*",
    ":(exclude)README.md",
    ":(exclude)docs/README.md",
    ":(exclude)docs/migrations/legacy-naming.md",
    ":(exclude)docs/release/repository-metadata.md"
  ],
  { cwd: workspaceRoot, encoding: "utf-8" }
);

if (result.error) {
  console.error("Failed to run git grep:", result.error);
  process.exit(1);
}

const output = result.stdout;
let hasViolations = false;

if (output) {
  const lines = output.split("\n").filter(Boolean);
  for (const line of lines) {
    const [file, lineNumber, ...contentParts] = line.split(":");
    const content = contentParts.join(":");
    
    // Check if this specific match is allowlisted
    if (!isAllowlisted(file, content)) {
      console.error(`\x1b[31mViolation\x1b[0m in ${file}:${lineNumber}`);
      console.error(`  ${content.trim()}`);
      hasViolations = true;
    }
  }
}

if (hasViolations) {
  console.error(`\n\x1b[31m[FAIL]\x1b[0m Found legacy identity strings that are not allowlisted.`);
  console.error(`Update the code or add them to quality/identity-allowlist.txt with a justification.`);
  process.exit(1);
} else {
  console.log(`\x1b[32m[PASS]\x1b[0m Identity check passed. No forbidden legacy strings found outside the allowlist.`);
  process.exit(0);
}
