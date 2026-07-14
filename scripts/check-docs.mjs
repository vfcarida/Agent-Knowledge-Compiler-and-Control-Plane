import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");

const REQUIRED_DOCS = [
  'docs/getting-started/quickstart.md',
  'docs/concepts/compiler.md',
  'docs/concepts/control-plane.md',
  'docs/concepts/ak-ir.md',
  'docs/specs/akcp-build-spec.md',
  'docs/specs/conformance.md',
  'docs/guides/create-domain-adapter.md',
  'docs/security/threat-model.md',
  'docs/security/mcp-security.md',
  'docs/walkthroughs/career.md',
  'docs/walkthroughs/it-ops.md',
  'docs/governance/spec-governance.md'
];

const ALLOWED_DIRECTORIES = [
  'getting-started',
  'concepts',
  'specs',
  'guides',
  'security',
  'walkthroughs',
  'governance',
  'reference',
  'adrs'
];

let hasMissingDocs = false;

for (const doc of REQUIRED_DOCS) {
  const docPath = path.join(workspaceRoot, doc);
  if (!fs.existsSync(docPath)) {
    console.error(`\x1b[31mMissing required document:\x1b[0m ${doc}`);
    hasMissingDocs = true;
  }
}

if (hasMissingDocs) {
  console.error(`\n\x1b[31m[FAIL]\x1b[0m Required documentation files are missing.`);
  process.exit(1);
} else {
  console.log(`\x1b[32m[PASS]\x1b[0m Document structure check passed.`);
  process.exit(0);
}
