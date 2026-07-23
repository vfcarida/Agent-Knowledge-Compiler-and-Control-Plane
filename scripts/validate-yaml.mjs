import fs from "fs";
import path from "path";
import * as yaml from "js-yaml";

// Simple recursive directory walk
function getFiles(dir, matchExts = [".yaml", ".yml"]) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.resolve(dir, file);
    if (
      filePath.includes("node_modules") ||
      filePath.includes("dist") ||
      filePath.includes("build")
    ) {
      return;
    }
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath, matchExts));
    } else {
      const ext = path.extname(filePath).toLowerCase();
      if (matchExts.includes(ext)) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const rootDir = process.cwd();
const files = getFiles(rootDir);

let hasError = false;

console.log(`Validating ${files.length} YAML files...`);

files.forEach((file) => {
  try {
    const content = fs.readFileSync(file, "utf8");
    yaml.load(content);
  } catch (err) {
    console.error(`\n❌ Error parsing ${path.relative(rootDir, file)}:`);
    console.error(err.message);
    hasError = true;
  }
});

if (hasError) {
  console.error("\nYAML validation failed.");
  process.exit(1);
} else {
  console.log("✅ All YAML files are valid.");
  process.exit(0);
}
