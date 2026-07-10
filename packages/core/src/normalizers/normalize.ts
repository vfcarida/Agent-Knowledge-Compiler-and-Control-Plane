import type { RawKnowledgeItem } from '../connectors/types.js';
import type { IRConcept } from '../ir/types.js';
import { FrontmatterParser } from '../infrastructure/frontmatter-parser.js';

/**
 * Normalizes a RawKnowledgeItem into an IRConcept.
 */
export function normalizeRawItem(item: RawKnowledgeItem): IRConcept {
  let type = 'Unknown';
  let conceptId = item.metadata.conceptId;
  let frontmatter: any = {};
  let body = item.rawContent;

  const originalFormat = item.metadata.originalFormat;

  if (originalFormat === 'okf/markdown' || originalFormat === 'openwiki/markdown' || originalFormat === 'markdown') {
    try {
      const parser = new FrontmatterParser();
      // We pass dummy paths because we only want to parse the frontmatter and body.
      // FrontmatterParser validates okf strictly, but for normal markdown we might need leniency.
      // We'll use the parser and catch errors.
      const doc = parser.parse(item.rawContent, 'dummy.md', 'dummy');
      frontmatter = doc.frontmatter;
      type = doc.frontmatter.type || 'Document';
      body = doc.body;
      if (!conceptId) {
         conceptId = doc.conceptId;
      }
    } catch (err: any) {
      // If it fails to parse as OKF, treat it as plain markdown
      type = 'Document';
    }
  }

  if (!conceptId) {
    if (item.metadata.relativePath) {
       // Convert 'skills/typescript.md' to 'skills/typescript'
       conceptId = item.metadata.relativePath.replace(/\.[^/.]+$/, "");
    } else {
       conceptId = `item-${item.contentHash.substring(0, 8)}`;
    }
  }

  if (originalFormat === 'openapi/endpoint') {
    type = 'Endpoint';
  }

  const byteSize = Buffer.byteLength(body, 'utf8');
  const estimatedTokens = Math.ceil(byteSize / 4);

  return {
    conceptId,
    type,
    source: {
      filePath: item.sourceUri, // Storing URI as filePath in IR
      format: originalFormat || 'unknown'
    },
    frontmatter,
    body,
    budget: {
      byteSize,
      estimatedTokens
    },
    status: 'active',
    isStale: false
  };
}
