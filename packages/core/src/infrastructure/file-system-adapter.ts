/**
 * @module infrastructure/file-system-adapter
 * @description Injectable filesystem adapter wrapping Node.js `fs/promises`.
 *
 * This adapter implements {@link IFileSystemAdapter} to provide a testable,
 * mockable abstraction over filesystem operations. In production, it delegates
 * to Node.js built-in `fs/promises`. In tests, it can be replaced with an
 * in-memory mock.
 */

import fs from "node:fs/promises";
import path from "node:path";

import type { IFileSystemAdapter } from "../domain/interfaces.js";

/**
 * Production filesystem adapter using Node.js `fs/promises`.
 */
export class FileSystemAdapter implements IFileSystemAdapter {
  /** @inheritdoc */
  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, "utf-8");
  }

  /** @inheritdoc */
  async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
  }

  /** @inheritdoc */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /** @inheritdoc */
  async mkdir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  /** @inheritdoc */
  async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  /**
   * List all `.md` files in a directory recursively.
   * Returns paths relative to the given directory.
   *
   * @param dirPath - Absolute path to the directory to scan
   * @param pattern - Optional glob pattern (defaults to `*.md`)
   * @returns Array of relative file paths
   */
  async listFiles(dirPath: string, pattern?: string): Promise<string[]> {
    const extension = pattern ?? ".md";
    const results: string[] = [];

    await this.walkDirectory(dirPath, dirPath, extension, results);

    return results.sort();
  }

  /**
   * Recursively walk a directory and collect matching files.
   */
  private async walkDirectory(
    currentDir: string,
    rootDir: string,
    extension: string,
    results: string[],
  ): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return; // Directory doesn't exist or can't be read
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        const ignoreDirs = [".git", "node_modules", "dist"];
        if (!ignoreDirs.includes(entry.name)) {
          await this.walkDirectory(fullPath, rootDir, extension, results);
        }
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        results.push(path.relative(rootDir, fullPath));
      }
    }
  }
}
