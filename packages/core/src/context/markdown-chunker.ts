export function chunkMarkdown(markdown: string, maxLength: number): string {
  if (markdown.length <= maxLength) {
    return markdown;
  }

  // Find all header positions to attempt a semantic split
  const headerRegex = /^(#{1,6})\s+(.*)$/gm;
  let match;
  const splitPoints: number[] = [];

  while ((match = headerRegex.exec(markdown)) !== null) {
    splitPoints.push(match.index);
  }

  // If there are no headers, fallback to paragraph splits
  if (splitPoints.length === 0) {
    return fallbackChunk(markdown, maxLength);
  }

  // Find the last header that fits within the maxLength
  let bestSplit = -1;
  for (const point of splitPoints) {
    if (point > 0 && point <= maxLength) {
      bestSplit = point;
    } else if (point > maxLength) {
      break;
    }
  }

  if (bestSplit > 0) {
    return markdown.substring(0, bestSplit).trim() + "\n\n...[TRUNCATED]";
  }

  return fallbackChunk(markdown, maxLength);
}

function fallbackChunk(text: string, maxLength: number): string {
  // Try to split on double newline (paragraph)
  const paragraphSplit = text.lastIndexOf("\n\n", maxLength);
  if (paragraphSplit > 0) {
    return text.substring(0, paragraphSplit).trim() + "\n\n...[TRUNCATED]";
  }

  // Try to split on single newline
  const lineSplit = text.lastIndexOf("\n", maxLength);
  if (lineSplit > 0) {
    return text.substring(0, lineSplit).trim() + "\n...[TRUNCATED]";
  }

  // Force split
  return text.substring(0, maxLength) + "...[TRUNCATED]";
}
