import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Forbidden Marketing Wording", () => {
  const findFiles = (dir: string, fileList: string[] = []): string[] => {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        if (!filePath.includes("node_modules") && !filePath.includes(".git")) {
          findFiles(filePath, fileList);
        }
      } else {
        if (filePath.endsWith(".md") || filePath.endsWith(".ts")) {
          fileList.push(filePath);
        }
      }
    }
    return fileList;
  };

  it("should not use misleading claims like 'fully implemented' for experimental features", () => {
    const workspaceRoot = path.resolve(__dirname, "../../../..");
    const docsDir = path.join(workspaceRoot, "docs");
    const cliDir = path.join(workspaceRoot, "packages/cli/src");

    // Exclude the maturity-model.md itself — it is the policy definition file
    // and is allowed to reference the forbidden phrases as illustrative examples.
    const excludedFiles = new Set([
      path.join(workspaceRoot, "docs", "project", "maturity-model.md"),
    ]);

    const filesToCheck = [
      ...findFiles(docsDir),
      ...findFiles(cliDir)
    ].filter(f => !excludedFiles.has(f));

    const forbiddenPhrases = [
      "fully implemented",
      "100% complete"
    ];

    let foundForbidden = false;
    const errors: string[] = [];

    for (const file of filesToCheck) {
      const content = fs.readFileSync(file, "utf-8").toLowerCase();
      
      // Specifically check for forbidden phrases if the context implies it's experimental, 
      // but to be safe we'll just check globally in docs and cli to enforce honesty.
      for (const phrase of forbiddenPhrases) {
        if (content.includes(phrase)) {
          // Allow exception in this very test file
          if (!file.includes("forbidden-words.test.ts")) {
            foundForbidden = true;
            errors.push(`File ${file} contains forbidden marketing phrase: "${phrase}"`);
          }
        }
      }
    }

    if (foundForbidden) {
      throw new Error("Found forbidden marketing phrases in documentation or code:\n" + errors.join("\n"));
    }
    
    expect(foundForbidden).toBe(false);
  });
});
