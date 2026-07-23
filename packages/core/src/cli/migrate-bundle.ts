#!/usr/bin/env tsx
/**
 * @module cli/migrate-bundle
 * @description Command line utility to run OKF bundle migrations.
 */

import path from "node:path";
import { FileSystemAdapter } from "../infrastructure/file-system-adapter.js";
import { FrontmatterParser } from "../infrastructure/frontmatter-parser.js";
import { migrateBundle } from "../migrations/migrate-bundle.js";

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const backup = args.includes("--backup");

  // Filter out flags to get target path
  const targetArg = args.find((a) => !a.startsWith("--"));
  const bundlePathEnv = targetArg || process.env["AKCP_BUNDLE_PATH"] || "./.okf";
  const bundlePath = path.resolve(bundlePathEnv);

  // eslint-disable-next-line no-console
  console.log(`[AKCP Migrator] Starting migration pipeline at: ${bundlePath}`);
  // eslint-disable-next-line no-console
  console.log(`  Flags: write=${write}, backup=${backup}`);

  const fsAdapter = new FileSystemAdapter();
  const fmParser = new FrontmatterParser();

  const report = await migrateBundle(fsAdapter, fmParser, bundlePath, {
    write,
    backup,
  });

  if (!report.success) {
    console.error(`[AKCP Migrator] Fatal migration failure: ${report.error}`);
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log(`\n[AKCP Migrator] Run summary:`);
  // eslint-disable-next-line no-console
  console.log(`  Files checked: ${report.filesChecked}`);
  // eslint-disable-next-line no-console
  console.log(`  Files needing migration: ${report.filesNeedingMigration}`);
  // eslint-disable-next-line no-console
  console.log(`  Files migrated: ${report.filesMigrated}`);

  if (report.backupPath) {
    // eslint-disable-next-line no-console
    console.log(`  Backup created at: ${report.backupPath}`);
  }

  if (report.filesNeedingMigration > 0 && !write) {
    // eslint-disable-next-line no-console
    console.log(
      `\n[AKCP Migrator] WARNING: Legacy files detected. Re-run with '--write' to execute migrations.`,
    );
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("[AKCP Migrator] Unhandled exception:", err);
  process.exit(1);
});
