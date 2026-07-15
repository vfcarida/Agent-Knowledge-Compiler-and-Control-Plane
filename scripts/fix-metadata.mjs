import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const REPO = {
  type: "git",
  url: "https://github.com/vfcarida/Agent-Knowledge-Compiler-and-Control-Plane.git"
};
const HOMEPAGE = 'https://github.com/vfcarida/Agent-Knowledge-Compiler-and-Control-Plane#readme';
const BUGS = {
  url: 'https://github.com/vfcarida/Agent-Knowledge-Compiler-and-Control-Plane/issues'
};
const LICENSE = 'MIT';

function fixPackage(pkgPath) {
  const content = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(content);
  
  pkg.license = LICENSE;
  pkg.repository = REPO;
  pkg.homepage = HOMEPAGE;
  pkg.bugs = BUGS;

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
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
      fixPackage(fullPath);
    }
  }
}

findPackages(ROOT);
console.log('Fixed metadata in all package.json files.');
