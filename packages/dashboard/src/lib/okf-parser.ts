/**
 * @module lib/okf-parser
 * @description Lightweight client-side parser for OKF Markdown files with YAML frontmatter.
 *
 * Implements a pure browser-safe parser that handles YAML frontmatter blocks
 * without requiring Node.js native dependencies.
 */

import type { OKFDoc } from "../types/career.js";

/**
 * Parses a raw Markdown string containing YAML frontmatter.
 *
 * @param content - Raw Markdown string
 * @param fileName - File basename (e.g. 'typescript.md')
 * @param category - Category folder (e.g. 'skills')
 */
export function parseOKFContent(
  content: string,
  fileName: string,
  category: string,
): OKFDoc {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

  if (!match) {
    return {
      frontmatter: { type: "Unknown" },
      body: content.trim(),
      conceptId: `${category}/${fileName.replace(/\.md$/, "")}`,
      fileName,
    };
  }

  const yamlBlock = match[1]!;
  const body = match[2]!.trim();
  const frontmatter: Record<string, any> = {};

  const lines = yamlBlock.split("\n");
  let currentKey: string | null = null;
  let currentList: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Handle bullet list array values:
    // tags:
    //   - frontend
    //   - backend
    if (trimmed.startsWith("-") && currentKey) {
      let val = trimmed.slice(1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      currentList.push(val);
      frontmatter[currentKey] = [...currentList];
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let val = trimmed.slice(colonIndex + 1).trim();

    // Remove quotes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }

    currentKey = key;
    currentList = [];

    // Parse array format like [typescript, react]
    if (val.startsWith("[") && val.endsWith("]")) {
      frontmatter[key] = val
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else if (val === "true") {
      frontmatter[key] = true;
    } else if (val === "false") {
      frontmatter[key] = false;
    } else if (!isNaN(Number(val)) && val !== "") {
      frontmatter[key] = Number(val);
    } else if (val === "" || val === null) {
      // Empty value, might be followed by a list
      frontmatter[key] = null;
    } else {
      frontmatter[key] = val;
    }
  }

  // Derive concept ID using folder structure category
  const conceptId = `${category}/${fileName.replace(/\.md$/, "")}`;

  return {
    frontmatter: {
      type: frontmatter["type"] || "Unknown",
      title: frontmatter["title"],
      description: frontmatter["description"],
      resource: frontmatter["resource"],
      tags: frontmatter["tags"],
      timestamp: frontmatter["timestamp"],
      ...frontmatter,
    },
    body,
    conceptId,
    fileName,
  };
}

/**
 * Parses log.md table rows into log entries.
 */
export function parseLogEntries(content: string): Array<{
  timestamp: string;
  action: string;
  conceptId: string;
  details?: string;
}> {
  const lines = content.split("\n");
  const entries: Array<{
    timestamp: string;
    action: string;
    conceptId: string;
    details?: string;
  }> = [];
  let inTable = false;
  let separatorPassed = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("| Timestamp")) {
      inTable = true;
      separatorPassed = false;
      continue;
    }

    if (inTable && /^\|[\s-:|]+$/.test(trimmed)) {
      separatorPassed = true;
      continue;
    }

    if (inTable && trimmed.startsWith("|") && separatorPassed) {
      const cells = trimmed
        .split(/(?<!\\)\|/)
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      if (cells.length >= 3) {
        entries.push({
          timestamp: cells[0]!,
          action: cells[1]!,
          conceptId: cells[2]!,
          details: cells[3] || undefined,
        });
      }
    } else if (inTable && !trimmed.startsWith("|")) {
      inTable = false;
    }
  }

  return entries;
}
