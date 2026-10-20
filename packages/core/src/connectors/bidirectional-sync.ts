import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as yaml from "js-yaml";

export type SyncDirection = "pull" | "push" | "bidirectional";
export type SyncConflictStrategy = "prefer-okf" | "prefer-wiki" | "fail";

export interface SyncStateEntry {
  relPath: string;
  baseBodyHash: string;
  okfBodyHash: string;
  wikiBodyHash: string;
  syncedAt: string;
}

export interface SyncStateManifest {
  version: "1.0";
  entries: Record<string, SyncStateEntry>;
}

export interface SyncConflict {
  relPath: string;
  baseBodyHash?: string;
  okfBodyHash: string;
  wikiBodyHash: string;
  resolution: "resolved-okf" | "resolved-wiki" | "unresolved";
}

export interface SyncActionItem {
  relPath: string;
  action:
    | "in-sync"
    | "imported-to-okf"
    | "exported-to-wiki"
    | "updated-okf"
    | "updated-wiki"
    | "conflict";
  preservedFrontmatterKeys?: string[];
}

export interface BidirectionalSyncOptions {
  okfDir: string;
  wikiDir: string;
  direction?: SyncDirection;
  conflictStrategy?: SyncConflictStrategy;
  dryRun?: boolean;
  stateFilePath?: string;
}

export interface BidirectionalSyncReport {
  ok: boolean;
  direction: SyncDirection;
  conflictStrategy: SyncConflictStrategy;
  dryRun: boolean;
  actions: SyncActionItem[];
  conflicts: SyncConflict[];
  summary: {
    inSync: number;
    importedToOkf: number;
    exportedToWiki: number;
    updatedOkf: number;
    updatedWiki: number;
    conflicts: number;
  };
}

const GOVERNED_OKF_KEYS = [
  "id",
  "type",
  "sensitivity",
  "owners",
  "ttlDays",
  "status",
  "freshnessClass",
  "depends_on",
  "mitigates",
  "references",
  "supersedes",
  "replacedBy",
] as const;

function sha256Normalized(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

function parseMarkdownParts(raw: string): {
  frontmatter: Record<string, unknown>;
  body: string;
  hasFrontmatter: boolean;
} {
  const normalized = raw.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { frontmatter: {}, body: normalized.trim(), hasFrontmatter: false };
  }
  const endIdx = normalized.indexOf("\n---\n", 4);
  if (endIdx === -1) {
    return { frontmatter: {}, body: normalized.trim(), hasFrontmatter: false };
  }
  const yamlBlock = normalized.slice(4, endIdx);
  const body = normalized.slice(endIdx + 5).trim();
  try {
    const parsed = yaml.load(yamlBlock);
    const fm =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    return { frontmatter: fm, body, hasFrontmatter: true };
  } catch {
    return { frontmatter: {}, body: normalized.trim(), hasFrontmatter: false };
  }
}

function serializeMarkdownParts(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  const yamlStr = yaml
    .dump(frontmatter, { sortKeys: true, lineWidth: 120 })
    .trim();
  return `---\n${yamlStr}\n---\n\n${body.trim()}\n`;
}

function listMarkdownFilesRecursive(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) return [];
  const results: string[] = [];

  function walk(current: string): void {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const rel = path.relative(rootDir, full).replace(/\\/g, "/");
        results.push(rel);
      }
    }
  }

  walk(rootDir);
  return results.sort();
}

function extractTitleFromMarkdown(
  body: string,
  fallbackRelPath: string,
): string {
  const h1Match = body.match(/^#\s+(.+)$/m);
  if (h1Match && h1Match[1]) {
    return h1Match[1].trim();
  }
  const base = path.basename(fallbackRelPath, ".md");
  return base
    .split(/[-_]+/)
    .map((w) => (w.length > 0 ? (w[0] ?? "").toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function slugifyId(relPath: string): string {
  return path
    .basename(relPath, ".md")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mergeWikiIntoOkfFrontmatter(
  okfFm: Record<string, unknown>,
  wikiFm: Record<string, unknown>,
  wikiBody: string,
  relPath: string,
): { merged: Record<string, unknown>; preservedKeys: string[] } {
  const merged: Record<string, unknown> = { ...wikiFm, ...okfFm };
  const preservedKeys: string[] = [];

  for (const key of GOVERNED_OKF_KEYS) {
    if (okfFm[key] !== undefined) {
      merged[key] = okfFm[key];
      preservedKeys.push(key);
    }
  }

  if (!merged.id) {
    merged.id = slugifyId(relPath);
  }
  if (!merged.type) {
    merged.type = "Concept";
  }
  if (!merged.sensitivity) {
    merged.sensitivity = "internal";
  }
  // Allow wiki title or H1 update if wiki explicitly changed title
  if (typeof wikiFm.title === "string" && wikiFm.title.trim().length > 0) {
    merged.title = wikiFm.title.trim();
  } else if (!merged.title) {
    merged.title = extractTitleFromMarkdown(wikiBody, relPath);
  }

  if (Array.isArray(wikiFm.tags)) {
    const existingTags = Array.isArray(okfFm.tags)
      ? (okfFm.tags as string[])
      : [];
    merged.tags = Array.from(
      new Set([...existingTags, ...(wikiFm.tags as string[])]),
    ).sort();
  }

  return { merged, preservedKeys };
}

function buildWikiFrontmatterFromOkf(
  okfFm: Record<string, unknown>,
): Record<string, unknown> {
  const wikiFm: Record<string, unknown> = {};
  if (okfFm.id) wikiFm.id = okfFm.id;
  if (okfFm.title) wikiFm.title = okfFm.title;
  if (okfFm.type) wikiFm.type = okfFm.type;
  if (Array.isArray(okfFm.tags)) wikiFm.tags = okfFm.tags;
  return wikiFm;
}

/**
 * Executes a deterministic 3-way bidirectional synchronization between an OKF bundle
 * directory and an OpenWiki Markdown directory while preserving governed OKF metadata.
 */
export async function syncOpenWikiBidirectional(
  options: BidirectionalSyncOptions,
): Promise<BidirectionalSyncReport> {
  const okfDir = path.resolve(options.okfDir);
  const wikiDir = path.resolve(options.wikiDir);
  const direction: SyncDirection = options.direction ?? "bidirectional";
  const conflictStrategy: SyncConflictStrategy =
    options.conflictStrategy ?? "prefer-okf";
  const dryRun = Boolean(options.dryRun);
  const statePath = path.resolve(
    options.stateFilePath ?? path.join(okfDir, ".akcp-sync-state.json"),
  );

  let stateManifest: SyncStateManifest = { version: "1.0", entries: {} };
  if (fs.existsSync(statePath)) {
    try {
      stateManifest = JSON.parse(
        fs.readFileSync(statePath, "utf-8"),
      ) as SyncStateManifest;
    } catch {
      stateManifest = { version: "1.0", entries: {} };
    }
  }

  const okfFiles = new Set(listMarkdownFilesRecursive(okfDir));
  const wikiFiles = new Set(listMarkdownFilesRecursive(wikiDir));
  const allRelPaths = Array.from(new Set([...okfFiles, ...wikiFiles])).sort();

  const actions: SyncActionItem[] = [];
  const conflicts: SyncConflict[] = [];

  for (const relPath of allRelPaths) {
    const okfFullPath = path.join(okfDir, relPath);
    const wikiFullPath = path.join(wikiDir, relPath);
    const inOkf = okfFiles.has(relPath);
    const inWiki = wikiFiles.has(relPath);
    const prevState = stateManifest.entries[relPath];

    if (inWiki && !inOkf) {
      if (direction === "push") continue;
      const rawWiki = fs.readFileSync(wikiFullPath, "utf-8");
      const parsedWiki = parseMarkdownParts(rawWiki);
      const { merged, preservedKeys } = mergeWikiIntoOkfFrontmatter(
        {},
        parsedWiki.frontmatter,
        parsedWiki.body,
        relPath,
      );
      const bodyHash = sha256Normalized(parsedWiki.body);

      if (!dryRun) {
        fs.mkdirSync(path.dirname(okfFullPath), { recursive: true });
        fs.writeFileSync(
          okfFullPath,
          serializeMarkdownParts(merged, parsedWiki.body),
          "utf-8",
        );
        stateManifest.entries[relPath] = {
          relPath,
          baseBodyHash: bodyHash,
          okfBodyHash: bodyHash,
          wikiBodyHash: bodyHash,
          syncedAt: new Date().toISOString(),
        };
      }

      actions.push({
        relPath,
        action: "imported-to-okf",
        preservedFrontmatterKeys: preservedKeys,
      });
      continue;
    }

    if (inOkf && !inWiki) {
      if (direction === "pull") continue;
      const rawOkf = fs.readFileSync(okfFullPath, "utf-8");
      const parsedOkf = parseMarkdownParts(rawOkf);
      const wikiFm = buildWikiFrontmatterFromOkf(parsedOkf.frontmatter);
      const bodyHash = sha256Normalized(parsedOkf.body);

      if (!dryRun) {
        fs.mkdirSync(path.dirname(wikiFullPath), { recursive: true });
        fs.writeFileSync(
          wikiFullPath,
          serializeMarkdownParts(wikiFm, parsedOkf.body),
          "utf-8",
        );
        stateManifest.entries[relPath] = {
          relPath,
          baseBodyHash: bodyHash,
          okfBodyHash: bodyHash,
          wikiBodyHash: bodyHash,
          syncedAt: new Date().toISOString(),
        };
      }

      actions.push({
        relPath,
        action: "exported-to-wiki",
      });
      continue;
    }

    // Both exist
    const rawOkf = fs.readFileSync(okfFullPath, "utf-8");
    const rawWiki = fs.readFileSync(wikiFullPath, "utf-8");
    const parsedOkf = parseMarkdownParts(rawOkf);
    const parsedWiki = parseMarkdownParts(rawWiki);

    const okfBodyHash = sha256Normalized(parsedOkf.body);
    const wikiBodyHash = sha256Normalized(parsedWiki.body);

    if (okfBodyHash === wikiBodyHash) {
      if (!dryRun) {
        stateManifest.entries[relPath] = {
          relPath,
          baseBodyHash: okfBodyHash,
          okfBodyHash,
          wikiBodyHash,
          syncedAt: new Date().toISOString(),
        };
      }
      actions.push({ relPath, action: "in-sync" });
      continue;
    }

    const baseHash = prevState?.baseBodyHash;
    const okfChanged = baseHash ? okfBodyHash !== baseHash : true;
    const wikiChanged = baseHash ? wikiBodyHash !== baseHash : true;

    if (direction === "pull" || (!okfChanged && wikiChanged)) {
      const { merged, preservedKeys } = mergeWikiIntoOkfFrontmatter(
        parsedOkf.frontmatter,
        parsedWiki.frontmatter,
        parsedWiki.body,
        relPath,
      );
      if (!dryRun) {
        fs.writeFileSync(
          okfFullPath,
          serializeMarkdownParts(merged, parsedWiki.body),
          "utf-8",
        );
        stateManifest.entries[relPath] = {
          relPath,
          baseBodyHash: wikiBodyHash,
          okfBodyHash: wikiBodyHash,
          wikiBodyHash,
          syncedAt: new Date().toISOString(),
        };
      }
      actions.push({
        relPath,
        action: "updated-okf",
        preservedFrontmatterKeys: preservedKeys,
      });
      continue;
    }

    if (direction === "push" || (okfChanged && !wikiChanged)) {
      const wikiFm = buildWikiFrontmatterFromOkf(parsedOkf.frontmatter);
      if (!dryRun) {
        fs.writeFileSync(
          wikiFullPath,
          serializeMarkdownParts(wikiFm, parsedOkf.body),
          "utf-8",
        );
        stateManifest.entries[relPath] = {
          relPath,
          baseBodyHash: okfBodyHash,
          okfBodyHash,
          wikiBodyHash: okfBodyHash,
          syncedAt: new Date().toISOString(),
        };
      }
      actions.push({ relPath, action: "updated-wiki" });
      continue;
    }

    // Both changed (or no baseHash and bodies differ in bidirectional mode) -> 3-way conflict
    if (conflictStrategy === "fail") {
      conflicts.push({
        relPath,
        baseBodyHash: baseHash,
        okfBodyHash,
        wikiBodyHash,
        resolution: "unresolved",
      });
      actions.push({ relPath, action: "conflict" });
    } else if (conflictStrategy === "prefer-wiki") {
      const { merged, preservedKeys } = mergeWikiIntoOkfFrontmatter(
        parsedOkf.frontmatter,
        parsedWiki.frontmatter,
        parsedWiki.body,
        relPath,
      );
      if (!dryRun) {
        fs.writeFileSync(
          okfFullPath,
          serializeMarkdownParts(merged, parsedWiki.body),
          "utf-8",
        );
        stateManifest.entries[relPath] = {
          relPath,
          baseBodyHash: wikiBodyHash,
          okfBodyHash: wikiBodyHash,
          wikiBodyHash,
          syncedAt: new Date().toISOString(),
        };
      }
      conflicts.push({
        relPath,
        baseBodyHash: baseHash,
        okfBodyHash,
        wikiBodyHash,
        resolution: "resolved-wiki",
      });
      actions.push({
        relPath,
        action: "updated-okf",
        preservedFrontmatterKeys: preservedKeys,
      });
    } else {
      // prefer-okf
      const wikiFm = buildWikiFrontmatterFromOkf(parsedOkf.frontmatter);
      if (!dryRun) {
        fs.writeFileSync(
          wikiFullPath,
          serializeMarkdownParts(wikiFm, parsedOkf.body),
          "utf-8",
        );
        stateManifest.entries[relPath] = {
          relPath,
          baseBodyHash: okfBodyHash,
          okfBodyHash,
          wikiBodyHash: okfBodyHash,
          syncedAt: new Date().toISOString(),
        };
      }
      conflicts.push({
        relPath,
        baseBodyHash: baseHash,
        okfBodyHash,
        wikiBodyHash,
        resolution: "resolved-okf",
      });
      actions.push({ relPath, action: "updated-wiki" });
    }
  }

  if (!dryRun && fs.existsSync(okfDir)) {
    fs.writeFileSync(
      statePath,
      JSON.stringify(stateManifest, null, 2),
      "utf-8",
    );
  }

  const summary = {
    inSync: actions.filter((a) => a.action === "in-sync").length,
    importedToOkf: actions.filter((a) => a.action === "imported-to-okf").length,
    exportedToWiki: actions.filter((a) => a.action === "exported-to-wiki")
      .length,
    updatedOkf: actions.filter((a) => a.action === "updated-okf").length,
    updatedWiki: actions.filter((a) => a.action === "updated-wiki").length,
    conflicts: conflicts.length,
  };

  const hasUnresolvedConflicts = conflicts.some(
    (c) => c.resolution === "unresolved",
  );

  return {
    ok: !hasUnresolvedConflicts,
    direction,
    conflictStrategy,
    dryRun,
    actions,
    conflicts,
    summary,
  };
}
