const fs = require('fs');
const file = 'packages/cli/src/index.ts';
let content = fs.readFileSync(file, 'utf8');

const importMap = new Map();

// Match const { A, B } = await import("module");
content = content.replace(/const\s+\{([^}]+)\}\s*=\s*await\s+import\("([^"]+)"\);/g, (match, names, mod) => {
  if (!importMap.has(mod)) importMap.set(mod, { named: new Set(), default: null });
  
  names.split(',').forEach(n => {
    const name = n.trim();
    if (name) importMap.get(mod).named.add(name);
  });
  return '';
});

// Match const name = await import("module");
content = content.replace(/const\s+([a-zA-Z0-9_]+)\s*=\s*await\s+import\("([^"]+)"\);/g, (match, name, mod) => {
  if (!importMap.has(mod)) importMap.set(mod, { named: new Set(), default: null });
  importMap.get(mod).default = name;
  return '';
});

let importsToAdd = '\n// Static imports converted from lazy loading\n';
for (const [mod, data] of importMap.entries()) {
  if (mod === 'fs' || mod === 'path') continue; // Already imported at the top
  const namedImports = Array.from(data.named).join(', ');
  if (data.default && namedImports) {
    importsToAdd += `import ${data.default}, { ${namedImports} } from "${mod}";\n`;
  } else if (data.default) {
    importsToAdd += `import * as ${data.default} from "${mod}";\n`;
  } else if (namedImports) {
    importsToAdd += `import { ${namedImports} } from "${mod}";\n`;
  }
}

// Insert after the shebang using \r?\n
content = content.replace(/#!\/usr\/bin\/env node\r?\n/, '#!/usr/bin/env node\n' + importsToAdd + '\n');

fs.writeFileSync(file, content);
console.log('CLI dynamic imports removed smartly.');
