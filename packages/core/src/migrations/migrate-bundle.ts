/**
 * @module migrations/migrate-bundle
 * @description In-place bundle migrator upgrading legacy career records to AKCP Profile v1.
 */

import path from "node:path";
import type {
  IFileSystemAdapter,
  IFrontmatterParser,
} from "../domain/interfaces.js";

export interface MigrationReport {
  filesChecked: number;
  filesNeedingMigration: number;
  filesMigrated: number;
  migratedFiles: string[];
  backupPath?: string;
  success: boolean;
  error?: string;
}

export interface MigrationOptions {
  write?: boolean;
  backup?: boolean;
}

/**
 * Migration service to safely upgrade legacy OKF bundles to AKCP Profile v1.
 */
export async function migrateBundle(
  fsAdapter: IFileSystemAdapter,
  fmParser: IFrontmatterParser,
  bundleRoot: string,
  options: MigrationOptions = {},
): Promise<MigrationReport> {
  const write = options.write ?? false;
  const backup = options.backup ?? false;

  const report: MigrationReport = {
    filesChecked: 0,
    filesNeedingMigration: 0,
    filesMigrated: 0,
    migratedFiles: [],
    success: true,
  };

  try {
    // 1. Scan files recursively
    if (!(await fsAdapter.exists(bundleRoot))) {
      throw new Error(`Bundle root directory does not exist: ${bundleRoot}`);
    }

    const relativeFiles = await fsAdapter.listFiles(bundleRoot);
    const RESERVED_FILENAMES = new Set(["index.md", "log.md"]);

    const targetFiles = relativeFiles.filter((relPath) => {
      const base = path.basename(relPath);
      return relPath.endsWith(".md") && !RESERVED_FILENAMES.has(base);
    });

    // 2. Perform backup if requested
    if (backup && write) {
      const backupPath = `${bundleRoot.replace(/\/$/, "")}-backup`;
      await fsAdapter.mkdir(backupPath);
      for (const relPath of relativeFiles) {
        const srcPath = path.join(bundleRoot, relPath);
        const destPath = path.join(backupPath, relPath);
        const parentDir = path.dirname(destPath);
        await fsAdapter.mkdir(parentDir);
        const content = await fsAdapter.readFile(srcPath);
        await fsAdapter.writeFile(destPath, content);
      }
      report.backupPath = backupPath;
    }

    // 3. Process each file
    for (const relPath of targetFiles) {
      report.filesChecked++;
      const fullPath = path.join(bundleRoot, relPath);
      const rawContent = await fsAdapter.readFile(fullPath);

      try {
        const doc = fmParser.parse(rawContent, fullPath, bundleRoot);
        const fm = doc.frontmatter;

        // Check if schemaVersion is missing
        if (!fm["schemaVersion"]) {
          report.filesNeedingMigration++;

          if (write) {
            // Update frontmatter with AKCP profile version v1
            fm["schemaVersion"] = "akcp.profile/v1";
            fm["bundleVersion"] = "1.0.0";

            const updatedContent = fmParser.serialize(fm, doc.body);
            await fsAdapter.writeFile(fullPath, updatedContent);
            report.filesMigrated++;
            report.migratedFiles.push(doc.conceptId);
          }
        }
      } catch (err) {
        // Log individual parse failure and continue
        console.error(
          `[Migrator] Skipping corrupt file: ${relPath}. Error:`,
          err,
        );
      }
    }

    // 4. Update log.md with migration event
    if (write && report.filesMigrated > 0) {
      const logPath = path.join(bundleRoot, "log.md");
      const hasLog = await fsAdapter.exists(logPath);
      let logContent = "";

      if (hasLog) {
        logContent = await fsAdapter.readFile(logPath);
      } else {
        logContent =
          "---\ntype: Log\n---\n\n# Change Log\n\n| Timestamp | Action | Concept | Details |\n|---|---|---|---|";
      }

      const timestamp = new Date().toISOString();
      const actionLine = `| ${timestamp} | MIGRATED | bundle | Migrated ${report.filesMigrated} files to akcp.profile/v1 |`;

      // Prepend to table (below header rows)
      const lines = logContent.split("\n");
      const tableIndex = lines.findIndex((l) =>
        l.trim().startsWith("| Timestamp"),
      );

      if (
        tableIndex !== -1 &&
        lines[tableIndex + 1] &&
        /^\|[\s-:|]+$/.test(lines[tableIndex + 1]!.trim())
      ) {
        lines.splice(tableIndex + 2, 0, actionLine);
      } else {
        // Fallback append
        lines.push(actionLine);
      }

      await fsAdapter.writeFile(logPath, lines.join("\n"));
    }
  } catch (error) {
    report.success = false;
    report.error = error instanceof Error ? error.message : String(error);
  }

  return report;
}
