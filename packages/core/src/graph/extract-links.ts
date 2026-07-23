import path from "path";

/**
 * Normalizes a markdown link (relative or absolute) into a standard conceptId.
 * @param sourceConceptId The ID of the concept containing the link.
 * @param rawLink The raw target string from the markdown link.
 */
export function normalizeLinkId(
  sourceConceptId: string,
  rawLink: string,
): string {
  // Remove anchor hash if any
  const withoutHash = rawLink.split("#")[0];
  if (!withoutHash) return ""; // Was just an anchor link

  // Handle external links - we typically ignore them for internal semantic graphs
  if (withoutHash.startsWith("http://") || withoutHash.startsWith("https://")) {
    return withoutHash;
  }

  let resolvedPath = withoutHash;

  if (withoutHash.startsWith("/")) {
    // Absolute from root
    resolvedPath = withoutHash.slice(1);
  } else {
    // Relative to the source concept
    const sourceDir = path.dirname(sourceConceptId);
    resolvedPath = path.join(sourceDir, withoutHash);
  }

  // Normalize windows paths to posix
  resolvedPath = resolvedPath.replace(/\\/g, "/");

  // Strip .md extension if present for standard conceptId format
  if (resolvedPath.endsWith(".md")) {
    resolvedPath = resolvedPath.slice(0, -3);
  }

  // Handle case where path.join resolves to something like '.'
  if (resolvedPath === ".") {
    return "";
  }

  return resolvedPath;
}

/**
 * Extracts links from markdown body.
 * Matches standard markdown links: [text](target)
 */
export function extractMarkdownLinks(
  sourceConceptId: string,
  markdownBody: string,
): { targetConceptId: string; relationType: string }[] {
  const links: { targetConceptId: string; relationType: string }[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;

  let match;
  while ((match = regex.exec(markdownBody)) !== null) {
    const rawLink = match[2];
    if (!rawLink) continue;

    // Ignore external web links, mailto, etc., for the internal graph
    if (rawLink.startsWith("http") || rawLink.startsWith("mailto:")) {
      continue;
    }

    const targetConceptId = normalizeLinkId(sourceConceptId, rawLink);
    if (targetConceptId) {
      links.push({
        targetConceptId,
        relationType: "markdown_link",
      });
    }
  }

  return links;
}
