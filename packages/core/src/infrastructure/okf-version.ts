import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/**
 * Reads the `okf_version` a bundle's root `index.md` declares, per OKF v0.2
 * ("the bundle root's index.md may declare okf_version — the only
 * frontmatter key permitted there"). Returns undefined if there's no root
 * index.md, it has no frontmatter, or it declares no okf_version — all valid
 * per the spec, which explicitly forbids consumers from rejecting a bundle
 * over this.
 */
export function detectSourceOkfVersion(
  bundleRoot: string,
): string | undefined {
  const indexPath = path.join(bundleRoot, "index.md");
  if (!fs.existsSync(indexPath)) return undefined;

  try {
    const raw = fs.readFileSync(indexPath, "utf-8");
    const parsed = matter(raw);
    const version = parsed.data?.okf_version;
    return typeof version === "string" ? version : undefined;
  } catch {
    return undefined;
  }
}
