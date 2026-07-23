import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");

const REQUIRED_DOCS = [
  // Root
  "docs/README.md",
  "docs/status.md",
  "docs/glossary.md",

  // Getting Started
  "docs/getting-started/quickstart.md",
  "docs/getting-started/development.md",
  "docs/getting-started/examples.md",
  "docs/getting-started/migration.md",

  // Concepts
  "docs/concepts/overview.md",
  "docs/concepts/okf.md",
  "docs/concepts/ak-ir.md",
  "docs/concepts/compiler.md",
  "docs/concepts/control-plane.md",
  "docs/concepts/comparison.md",

  // Specs
  "docs/specs/README.md",
  "docs/specs/akcp-yaml.md",
  "docs/specs/policy-cards.md",
  "docs/specs/mcp-tool-contracts.md",

  // Security
  "docs/security/threat-model.md",
  "docs/security/automation-safety.md",

  // Governance
  "docs/governance/spec-governance.md",
  "docs/governance/release-policy.md",
  "docs/governance/rfc-process.md",

  // Reference
  "docs/reference/cli.md",
  "docs/reference/compile-targets.md",

  // Architecture
  "docs/architecture/README.md",

  // ADRs
  "docs/adrs/README.md",
];

const REQUIRED_EXAMPLE_FILES = [
  "examples/domains/career/README.md",
  "examples/domains/career/akcp.yaml",
  "examples/domains/it-operations/README.md",
  "examples/domains/it-operations/akcp.yaml",
  "examples/domains/customer-support/README.md",
  "examples/domains/customer-support/akcp.yaml",
];

const errors = [];

// 1. Validate REQUIRED_DOCS
for (const docPath of REQUIRED_DOCS) {
  const fullPath = path.join(workspaceRoot, docPath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing required doc: ${docPath}`);
    continue;
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  if (content.length < 50) {
    errors.push(`Doc too short (likely placeholder): ${docPath}`);
  }
  if (!content.includes("# ")) {
    errors.push(`Doc missing heading: ${docPath}`);
  }
}

// 2. Validate README.md links
const readmePath = path.join(workspaceRoot, "README.md");
if (fs.existsSync(readmePath)) {
  const readme = fs.readFileSync(readmePath, "utf-8");
  const links = readme.matchAll(/\]\(([^)]+)\)/g);
  for (const [, link] of links) {
    if (link.startsWith("docs/") || link.startsWith("./docs/")) {
      // Remove any #hash from link for file path resolution
      const linkWithoutHash = link.split('#')[0];
      const resolved = path.resolve(workspaceRoot, linkWithoutHash);
      if (!fs.existsSync(resolved)) {
        errors.push(`Broken link in README: ${link}`);
      }
    }
  }
}

// 3. Validate Example Readmes
for (const exampleFile of REQUIRED_EXAMPLE_FILES) {
  const fullPath = path.join(workspaceRoot, exampleFile);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing required example file: ${exampleFile}`);
    continue;
  }
  if (exampleFile.endsWith(".md")) {
    const content = fs.readFileSync(fullPath, "utf-8");
    if (content.length < 50) {
      errors.push(`Example README too short: ${exampleFile}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`\n\x1b[31m[FAIL]\x1b[0m Documentation validation failed:`);
  errors.forEach(err => console.error(` - ${err}`));
  process.exit(1);
} else {
  console.log(`\x1b[32m[PASS]\x1b[0m Document structure check passed.`);
  process.exit(0);
}
