/**
 * @module services/log-service
 * @description Manages the chronological `log.md` file for an OKF bundle.
 *
 * Per OKF spec §3.1, `log.md` is a reserved filename that records the
 * update history of the bundle. Entries are stored as rows in a Markdown
 * table and ordered newest-first so the most recent activity is always
 * at the top.
 */

import type { IFileSystemAdapter, ILogService } from "../domain/interfaces.js";
import type { LogEntry } from "../domain/types.js";

/**
 * YAML frontmatter header for the log file.
 */
const LOG_FRONTMATTER = [
  "---",
  "type: Log",
  "title: Change Log",
  "description: Chronological record of bundle changes",
  "---",
].join("\n");

/**
 * Markdown table header for log entries.
 */
const TABLE_HEADER = [
  "| Timestamp | Action | Concept | Details |",
  "|-----------|--------|---------|---------|",
].join("\n");

/**
 * Manages the `log.md` file within an OKF bundle.
 *
 * @example
 * ```ts
 * const logService = new LogService(fsAdapter, '/career-bundle/log.md');
 * await logService.append({
 *   timestamp: new Date().toISOString(),
 *   action: 'create',
 *   conceptId: 'skills/typescript',
 *   details: 'Added TypeScript skill document',
 * });
 * ```
 */
export class LogService implements ILogService {
  private readonly fsAdapter: IFileSystemAdapter;
  private readonly logFilePath: string;

  /**
   * @param fsAdapter   - Filesystem abstraction for I/O operations
   * @param logFilePath - Absolute path to the `log.md` file
   */
  constructor(fsAdapter: IFileSystemAdapter, logFilePath: string) {
    this.fsAdapter = fsAdapter;
    this.logFilePath = logFilePath;
  }

  /**
   * Append a new entry to the log.
   *
   * Reads the existing `log.md` (or creates it if it doesn't exist),
   * prepends the new entry row so that newest entries appear first,
   * and writes the updated file back to disk.
   *
   * @param entry - The log entry to prepend
   */
  async append(entry: LogEntry): Promise<void> {
    const existingEntries = await this.readExistingRows();

    // Format the new row
    const newRow = this.formatRow(entry);

    // Prepend the new entry (newest first)
    const allRows = [newRow, ...existingEntries];

    // Rebuild the complete file
    const content = [
      LOG_FRONTMATTER,
      "",
      "# Change Log",
      "",
      TABLE_HEADER,
      ...allRows,
      "", // Trailing newline
    ].join("\n");

    await this.fsAdapter.writeFile(this.logFilePath, content);
  }

  /**
   * Read all log entries, ordered newest first.
   *
   * Parses the Markdown table rows in `log.md` back into
   * {@link LogEntry} objects.
   *
   * @returns Array of log entries, newest first
   */
  async getEntries(): Promise<LogEntry[]> {
    const fileExists = await this.fsAdapter.exists(this.logFilePath);
    if (!fileExists) {
      return [];
    }

    const rawContent = await this.fsAdapter.readFile(this.logFilePath);
    return this.parseEntries(rawContent);
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Read existing table rows from the log file.
   * Returns an empty array if the file doesn't exist yet.
   */
  private async readExistingRows(): Promise<string[]> {
    const fileExists = await this.fsAdapter.exists(this.logFilePath);
    if (!fileExists) {
      return [];
    }

    const rawContent = await this.fsAdapter.readFile(this.logFilePath);
    return this.extractTableRows(rawContent);
  }

  /**
   * Extract raw table data rows (excluding header and separator) from
   * the Markdown content.
   */
  private extractTableRows(content: string): string[] {
    const lines = content.split("\n");
    const rows: string[] = [];
    let inTable = false;
    let headerRowsPassed = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith("| Timestamp")) {
        inTable = true;
        headerRowsPassed = 0;
        continue;
      }

      if (inTable && /^\|[\s-:|]+$/.test(trimmed)) {
        headerRowsPassed++;
        continue;
      }

      if (inTable && trimmed.startsWith("|") && headerRowsPassed > 0) {
        rows.push(trimmed);
      } else if (inTable && !trimmed.startsWith("|")) {
        // End of table
        break;
      }
    }

    return rows;
  }

  /**
   * Format a {@link LogEntry} as a Markdown table row.
   */
  private formatRow(entry: LogEntry): string {
    const details = entry.details?.replace(/\|/g, "\\|") ?? "";
    const action = entry.action.replace(/\|/g, "\\|");
    const conceptId = entry.conceptId.replace(/\|/g, "\\|");
    return `| ${entry.timestamp} | ${action} | ${conceptId} | ${details} |`;
  }

  /**
   * Parse the full Markdown content into an array of {@link LogEntry} objects.
   */
  private parseEntries(content: string): LogEntry[] {
    const rows = this.extractTableRows(content);
    const entries: LogEntry[] = [];

    for (const row of rows) {
      // Split by unescaped pipes and trim
      const cells = row
        .split(/(?<!\\)\|/)
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0);

      if (cells.length >= 3) {
        entries.push({
          timestamp: cells[0]!,
          action: cells[1]!.replace(/\\\|/g, "|"),
          conceptId: cells[2]!.replace(/\\\|/g, "|"),
          details: cells[3]?.replace(/\\\|/g, "|") || undefined,
        });
      }
    }

    return entries;
  }
}
