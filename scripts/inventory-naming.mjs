import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const legacyTerms = [
  "Open Career Format",
  "Open-Career-Format",
  "Open Career Format Orchestrator",
  "OCF",
  "@ocf",
  "open-career",
  "Agent-ready Knowledge Reference Architecture",
  "Agent-ready-Knowledge-Reference-Architecture",
  "ContextOps",
  "career data management"
];

// Ignore these directories entirely
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

const inventory = [];

walkSync(rootDir, (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  let lineNum = 1;
  const lines = content.split('\n');
  
  for (const line of lines) {
    for (const term of legacyTerms) {
      if (line.toLowerCase().includes(term.toLowerCase())) {
        // Skip paths in build-state if it's just the root dir path
        if (filePath.endsWith('build-state.json') && line.includes(rootDir.replace(/\\/g, '/'))) continue;
        if (filePath.endsWith('build-state.json') && line.includes(rootDir)) continue;
        if (filePath.includes('inventory-naming.mjs')) continue;
        if (filePath.includes('check-identity.mjs')) continue;

        inventory.push({
          file: path.relative(rootDir, filePath),
          line: lineNum,
          term,
          context: line.trim().substring(0, 80)
        });
      }
    }
    lineNum++;
  }
});

fs.writeFileSync(path.join(rootDir, 'inventory.json'), JSON.stringify(inventory, null, 2));
console.log(`Found ${inventory.length} occurrences. Saved to inventory.json`);
