const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, '../packages/cli/src/commands'));
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/register[a-zA-Z]+Command\(program: Command, ctx: CLIContext\)/g, match => {
    return match.replace('ctx: CLIContext', '_ctx: CLIContext');
  });
  // also fix the unused fs in scan.ts
  if (f.endsWith('scan.ts')) {
    content = content.replace("const fs = await import('fs');", "// fs not used");
  }
  fs.writeFileSync(f, content);
});

// Fix context.ts
const ctxPath = path.join(__dirname, '../packages/cli/src/context.ts');
let ctxContent = fs.readFileSync(ctxPath, 'utf8');
ctxContent = ctxContent.replace("import { CLIContext } from './types.js';", "import type { CLIContext } from './types.js';");
fs.writeFileSync(ctxPath, ctxContent);
console.log('Fixed ctx usages.');
