import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Avoid directories that we shouldn't touch
const ignoreDirs = ['node_modules', 'dist', '.git', '.akcp', 'scratch'];

function walkSync(currentDirPath, callback) {
  const files = fs.readdirSync(currentDirPath);
  for (const name of files) {
    const filePath = path.join(currentDirPath, name);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      callback(filePath);
    } else if (stat.isDirectory() && !ignoreDirs.includes(name)) {
      walkSync(filePath, callback);
    }
  }
}

const replacements = [
  { search: /Open Career Format Orchestrator/gi, replace: "Agent Knowledge Compiler and Control Plane (AKCP)" },
  { search: /Agent-ready Knowledge Reference Architecture/gi, replace: "Agent Knowledge Compiler and Control Plane (AKCP)" },
  { search: /Agent-ready-Knowledge-Reference-Architecture/gi, replace: "Agent-Knowledge-Compiler-and-Control-Plane" },
  { search: /ContextOps/g, replace: "Agent Knowledge Compiler and Control Plane (AKCP)" },
  { search: /Open Career Format/g, replace: "AKCP" },
  { search: /Open-Career-Format/g, replace: "AKCP" },
  { search: /@ocf\//g, replace: "@akcp/" },
  { search: /\bocf\b/g, replace: "akcp" },
  { search: /\bOCF\b/g, replace: "AKCP" }
];

walkSync(rootDir, (filePath) => {
  // Do not touch binary files, locks, or our migration/script files
  if (
    filePath.endsWith('.lock') || 
    filePath.endsWith('.yaml') && filePath.includes('pnpm-lock') ||
    filePath.includes('inventory-naming.mjs') ||
    filePath.includes('migrate-identity.mjs') ||
    filePath.includes('legacy-naming.md') || // DO NOT rewrite the migration history file we just made!
    filePath.includes('legacy-ocf-bin.ts') || // Allow OCF in the shim file
    filePath.includes('identity.test.ts') ||
    filePath.endsWith('check-identity.mjs') ||
    filePath.includes('patch-all.mjs') ||
    filePath.includes('patch-legacy') ||
    filePath.endsWith('.json') && filePath.includes('package-lock')
  ) {
    return;
  }
  
  // Skip tests snapshots and sample-data if they are specifically career domain data, 
  // BUT the instructions said "Rewrite old OCF references in ... examples ...".
  // Let's do a safe string replace.
  
  const ext = path.extname(filePath);
  if (!['.ts', '.tsx', '.js', '.mjs', '.md', '.json', '.yaml', '.txt', '.xml', '.html'].includes(ext)) {
    return;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  let modified = original;

  for (const r of replacements) {
    // If we are in sample-data/.okf, we shouldn't replace "career data management" or specific terms 
    // unless it's strictly "Open Career Format" or "OCF". 
    // The regexes are scoped to exact matches.
    modified = modified.replace(r.search, r.replace);
  }

  if (original !== modified) {
    fs.writeFileSync(filePath, modified);
    console.log(`Updated: ${path.relative(rootDir, filePath)}`);
  }
});
