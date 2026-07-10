import fs from 'fs';
import path from 'path';

const searchTerms = [
  { regex: /Agent Knowledge Compiler and Control Plane/gi, replacement: 'Agent Knowledge Compiler and Control Plane' },
  { regex: /Agent Knowledge Compiler and Control Plane (AKCP)/gi, replacement: 'Agent Knowledge Compiler and Control Plane (AKCP)' },
  { regex: /Agent Knowledge Compiler and Control Plane/gi, replacement: 'Agent Knowledge Compiler and Control Plane' },
  { regex: /\bContextOps\b/g, replacement: 'AKCP' },
  { regex: /akcp/g, replacement: 'akcp' },
  { regex: /AKCP/g, replacement: 'AKCP' },
  { regex: /akcp-profile-server/g, replacement: 'akcp-profile-server' },
  { regex: /AKCPProfileServer/g, replacement: 'AKCPProfileServer' }
];

const ignoreDirs = ['node_modules', '.git', 'dist', 'coverage', '.system_generated', '.agents', 'migrations'];

function walk(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!ignoreDirs.includes(file)) {
        walk(fullPath);
      }
    } else if (stat.isFile() && (fullPath.endsWith('.md') || fullPath.endsWith('.ts') || fullPath.endsWith('.json') || fullPath.endsWith('.tsx'))) {
      if (fullPath.includes('identity-migration-audit') || fullPath.includes('legacy-names-and-aliases') || fullPath.includes('naming-and-identity')) continue;
      if (fullPath.endsWith('package-lock.json') || fullPath.endsWith('pnpm-lock.yaml')) continue;

      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const term of searchTerms) {
        if (term.regex.test(content)) {
          // Reset regex state
          term.regex.lastIndex = 0;
          content = content.replace(term.regex, term.replacement);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

walk(process.cwd());
