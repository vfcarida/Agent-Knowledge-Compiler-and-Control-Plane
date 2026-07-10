const fs = require('fs');
const content = fs.readFileSync('packages/cli/src/index.ts', 'utf-8');
const lines = content.split('\n');

let backtickCount = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const count = (line.match(/`/g) || []).length;
  if (count > 0) {
    backtickCount += count;
    console.log(`Line ${i + 1} (${count}): ${line.trim()}`);
  }
}
console.log(`Total backticks: ${backtickCount}`);
