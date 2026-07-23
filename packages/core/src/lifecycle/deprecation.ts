import type { OKFDocument } from "../domain/types.js";

export class Deprecation {
  /**
   * Traces the deprecation chain to find the ultimate active successor for a given document.
   * If a document is deprecated and points to a successor, this will recursively resolve
   * until it finds an active/stale document or hits a broken link/cycle.
   *
   * @returns The conceptId of the ultimate successor, or null if no active successor exists.
   */
  public static resolveUltimateSuccessor(
    startDoc: OKFDocument,
    allDocsMap: Map<string, OKFDocument>,
  ): string | null {
    let currentId = startDoc.conceptId;
    const visited = new Set<string>();

    while (true) {
      if (visited.has(currentId)) {
        console.warn(
          `[Lifecycle] Cycle detected resolving successor for ${startDoc.conceptId} at ${currentId}`,
        );
        return null;
      }
      visited.add(currentId);

      const doc = allDocsMap.get(currentId);
      if (!doc) {
        return null; // Broken link
      }

      const status = doc.frontmatter.status;
      if (status !== "deprecated" && status !== "archived") {
        // We found a non-deprecated document in the chain (could be the startDoc itself)
        return currentId === startDoc.conceptId ? null : currentId;
      }

      const successor = doc.frontmatter.successor;
      if (!successor) {
        return null; // Deprecated but no successor
      }

      currentId = successor as string;
    }
  }
}
