import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");

const result = spawnSync("git", ["ls-files", "*.md"], { cwd: workspaceRoot, encoding: "utf-8" });
if (result.error) {
  console.error("Failed to run git ls-files:", result.error);
  process.exit(1);
}

const mdFiles = result.stdout.split("\n").filter(Boolean);
let hasBrokenLinks = false;

// Basic regex to find markdown links: [text](link)
const linkRegex = /\[[^\]]*\]\(([^)]+)\)/g;

for (const file of mdFiles) {
  const filePath = path.join(workspaceRoot, file);
  if (!fs.existsSync(filePath)) continue;
  if (filePath.includes("okf-warning-broken-link")) continue;

  const content = fs.readFileSync(filePath, "utf-8");
  let match;
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const lineNumber = 1;
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    while ((match = linkRegex.exec(line)) !== null) {
      let link = match[1].trim();

      // Ignore http/https, mailto, and fragment-only links
      if (link.startsWith("http") || link.startsWith("mailto:") || link.startsWith("#")) {
        continue;
      }

      // Strip fragments from local links
      const hashIndex = link.indexOf("#");
      if (hashIndex !== -1) {
        link = link.substring(0, hashIndex);
      }
      
      // If the link is empty after stripping fragment, it was a fragment-only link, skip
      if (!link) continue;

      let targetPath;
      if (link.startsWith("/")) {
        // Absolute path from repo root
        targetPath = path.join(workspaceRoot, link.substring(1));
      } else {
        // Relative path
        targetPath = path.resolve(path.dirname(filePath), link);
      }

      if (!fs.existsSync(targetPath)) {
        console.error(`\x1b[31mBroken Link\x1b[0m in ${file}:${i + 1}`);
        console.error(`  Link: ${link}`);
        console.error(`  Resolved to: ${path.relative(workspaceRoot, targetPath)}`);
        hasBrokenLinks = true;
      }
    }
  }
}

if (hasBrokenLinks) {
  console.error(`\n\x1b[31m[FAIL]\x1b[0m Found broken local markdown links.`);
  process.exit(1);
} else {
  console.log(`\x1b[32m[PASS]\x1b[0m Markdown link check passed.`);
  process.exit(0);
}
