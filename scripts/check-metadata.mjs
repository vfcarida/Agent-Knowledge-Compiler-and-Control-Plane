import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const REQUIRED_REPO_URL = 'https://github.com/vfcarida/Agent-Knowledge-Compiler-and-Control-Plane.git';
const REQUIRED_HOMEPAGE_URL = 'https://github.com/vfcarida/Agent-Knowledge-Compiler-and-Control-Plane#readme';
const REQUIRED_BUGS_URL = 'https://github.com/vfcarida/Agent-Knowledge-Compiler-and-Control-Plane/issues';
const REQUIRED_LICENSE = 'MIT';
const BANNED_TERMS = [/open career format/i, /ocf/i, /contextops/i, /agent-ready knowledge/i];

let errors = 0;

function checkPackage(pkgPath) {
  const content = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(content);
  const relativePath = path.relative(ROOT, pkgPath);

  // 1. Check Name
  if (!pkg.name.startsWith('@akcp/') && pkg.name !== 'agent-knowledge-compiler-and-control-plane') {
    console.error(`[ERROR] ${relativePath}: Invalid name "${pkg.name}". Must be in @akcp scope.`);
    errors++;
  }

  // 2. Check Banned terms in descriptions and keywords
  const description = pkg.description || '';
  for (const term of BANNED_TERMS) {
    if (term.test(description)) {
      console.error(`[ERROR] ${relativePath}: Description contains legacy term matching ${term}.`);
      errors++;
    }
  }

  // 3. Check License
  if (pkg.license !== REQUIRED_LICENSE) {
    console.error(`[ERROR] ${relativePath}: Invalid license "${pkg.license}". Must be ${REQUIRED_LICENSE}.`);
    errors++;
  }

  // 4. Check Repository
  if (pkg.repository?.url !== REQUIRED_REPO_URL && pkg.repository !== REQUIRED_REPO_URL) {
    console.error(`[ERROR] ${relativePath}: Invalid repository URL.`);
    errors++;
  }

  // 5. Check Homepage
  if (pkg.homepage && pkg.homepage !== REQUIRED_HOMEPAGE_URL) {
    console.error(`[ERROR] ${relativePath}: Invalid homepage URL.`);
    errors++;
  }

  // 6. Check Bugs URL
  if (pkg.bugs?.url && pkg.bugs.url !== REQUIRED_BUGS_URL) {
    console.error(`[ERROR] ${relativePath}: Invalid bugs URL.`);
    errors++;
  }
}

function findPackages(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        findPackages(fullPath);
      }
    } else if (file === 'package.json') {
      checkPackage(fullPath);
    }
  }
}

console.log('Running Metadata Consistency Check...');
findPackages(ROOT);

if (errors > 0) {
  console.error(`\nMetadata check failed with ${errors} errors.`);
  process.exit(1);
} else {
  console.log('\nAll package metadata is AKCP-compliant. ✅');
}
