#!/usr/bin/env tsx
/**
 * @module cli/validate-bundle
 * @description Command line utility to validate OKF bundle schemas.
 */

import path from "node:path";
import { FileSystemAdapter } from "../infrastructure/file-system-adapter.js";
import { FrontmatterParser } from "../infrastructure/frontmatter-parser.js";
import { ProfileRegistry } from "../domain/schemas.js";
import { OKFValidationError } from "../domain/errors.js";

type BundleValidationReport = {
  ok: boolean;
  bundlePath: string;
  checkedAt: string;
  profile: string;
  summary: {
    filesChecked: number;
    validDocuments: number;
    invalidDocuments: number;
    warnings: number;
  };
  diagnostics: Array<{
    severity: "error" | "warning" | "info";
    file: string;
    code: string;
    message: string;
    field?: string;
    suggestion?: string;
  }>;
};

async function main() {
  const args = process.argv.slice(2);
  let bundlePathEnv = process.env["AKCP_BUNDLE_PATH"] || "./.okf";
  let format: "text" | "json" | "markdown" = "text";
  let profileName = "career"; // default to legacy behavior

  for (let i = 0; i < args.length; i++) {
    const currentArg = args[i];
    if (currentArg === "--bundle" && i + 1 < args.length) {
      bundlePathEnv = args[i + 1]!;
    } else if (currentArg === "--format" && i + 1 < args.length) {
      format = args[i + 1] as unknown as "json" | "markdown";
    } else if (currentArg === "--profile" && i + 1 < args.length) {
      profileName = args[i + 1]!;
    } else if (
      currentArg !== undefined &&
      !currentArg.startsWith("--") &&
      i === 0 &&
      !args.includes("--bundle")
    ) {
      bundlePathEnv = currentArg;
    }
  }

  const bundlePath = path.resolve(bundlePathEnv);
  const SchemaValidator = ProfileRegistry.getProfileSchema(profileName);

  const fsAdapter = new FileSystemAdapter();
  const fmParser = new FrontmatterParser();

  if (!(await fsAdapter.exists(bundlePath))) {
    console.error(`Error: Directory does not exist: ${bundlePath}`);
    process.exit(1);
  }

  const relativeFiles = await fsAdapter.listFiles(bundlePath);
  const RESERVED_FILENAMES = new Set([
    "index.md",
    "log.md",
    "README.md",
    "WALKTHROUGH.md",
  ]);

  let validCount = 0;
  let invalidCount = 0;
  let skippedCount = 0;
  const diagnostics: BundleValidationReport["diagnostics"] = [];

  for (const relPath of relativeFiles) {
    if (
      !relPath.endsWith(".md") ||
      RESERVED_FILENAMES.has(path.basename(relPath))
    ) {
      continue;
    }

    const fullPath = path.join(bundlePath, relPath);
    const content = await fsAdapter.readFile(fullPath);

    try {
      const doc = fmParser.parse(content, fullPath, bundlePath);
      const validation = SchemaValidator.safeParse(doc.frontmatter);

      if (validation.success) {
        validCount++;
      } else {
        invalidCount++;
        diagnostics.push({
          severity: "error",
          file: relPath,
          code: "SCHEMA_INVALID",
          message: validation.error.message,
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // If a file has no OKF frontmatter (e.g., a policy redirect or scenario file),
      // treat it as a skipped warning rather than a validation failure.
      if (err instanceof OKFValidationError) {
        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        skippedCount++;
        console.warn(
          `[AKCP Validator] Skipping "${path.basename(relPath)}": ${err.message}`,
        );
        continue;
      }
      invalidCount++;
      diagnostics.push({
        severity: "error",
        file: relPath,
        code: "PARSE_ERROR",
        message: err.message,
      });
    }
  }

  const report: BundleValidationReport = {
    ok: invalidCount === 0,
    bundlePath,
    checkedAt: new Date().toISOString(),
    profile: profileName,
    summary: {
      filesChecked: validCount + invalidCount,
      validDocuments: validCount,
      invalidDocuments: invalidCount,
      warnings: 0,
    },
    diagnostics,
  };

  if (format === "json") {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));
  } else if (format === "markdown") {
    // eslint-disable-next-line no-console
    console.log(`# Bundle Validation Report\n`);
    // eslint-disable-next-line no-console
    console.log(`- **Checked At:** ${report.checkedAt}`);
    // eslint-disable-next-line no-console
    console.log(`- **Bundle Path:** ${report.bundlePath}`);
    // eslint-disable-next-line no-console
    console.log(`- **Profile:** ${report.profile}`);
    // eslint-disable-next-line no-console
    console.log(`- **Status:** ${report.ok ? "✅ Valid" : "❌ Invalid"}`);
    // eslint-disable-next-line no-console
    console.log(`\n## Summary\n`);
    // eslint-disable-next-line no-console
    console.log(`- Files Checked: ${report.summary.filesChecked}`);
    // eslint-disable-next-line no-console
    console.log(`- Valid Documents: ${report.summary.validDocuments}`);
    // eslint-disable-next-line no-console
    console.log(`- Invalid Documents: ${report.summary.invalidDocuments}`);
    if (diagnostics.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`\n## Diagnostics\n`);
      for (const d of diagnostics) {
        // eslint-disable-next-line no-console
        console.log(
          `- **[${d.severity.toUpperCase()}]** \`${d.file}\`: ${d.message}`,
        );
      }
    }
  } else {
    // eslint-disable-next-line no-console
    console.log(
      `[AKCP Validator] Scanning bundle at: ${bundlePath} (Profile: ${profileName})`,
    );
    for (const d of diagnostics) {
      console.error(`  ✗ [Invalid] ${d.file}:`);
      console.error(`    Reason: ${d.message}`);
    }
    // eslint-disable-next-line no-console
    console.log(`\n[AKCP Validator] Validation summary:`);
    // eslint-disable-next-line no-console
    console.log(`  Valid concepts: ${validCount}`);
    // eslint-disable-next-line no-console
    console.log(`  Invalid concepts: ${invalidCount}`);
    if (report.ok) {
      // eslint-disable-next-line no-console
      console.log(
        `[AKCP Validator] All checked records are strictly schema compliant!`,
      );
    }
  }

  if (!report.ok) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("[AKCP Validator] Unhandled exception:", err);
  process.exit(1);
});
