import { describe, it, expect } from "vitest";
import { chunkMarkdown } from "../../context/markdown-chunker.js";

describe("chunkMarkdown", () => {
  it("returns full markdown when length is within maxLength", () => {
    const text = "# Title\n\nShort content.";
    expect(chunkMarkdown(text, 100)).toBe(text);
  });

  it("splits markdown at the best header point before maxLength", () => {
    const text = `# Section 1
Content for section 1.

# Section 2
Content for section 2 is very long and goes on.

# Section 3
Content for section 3.`;

    const chunked = chunkMarkdown(text, 80);
    expect(chunked).toContain("# Section 1");
    expect(chunked).toContain("...[TRUNCATED]");
    expect(chunked).not.toContain("# Section 3");
  });

  it("falls back to paragraph split when no headers exist", () => {
    const text =
      "Paragraph 1 is here.\n\nParagraph 2 is here.\n\nParagraph 3 is here.";
    const chunked = chunkMarkdown(text, 35);

    expect(chunked).toContain("Paragraph 1 is here.");
    expect(chunked).toContain("...[TRUNCATED]");
  });

  it("falls back to line split when no double newlines fit", () => {
    const text = "Line 1 is here.\nLine 2 is here.\nLine 3 is here.";
    const chunked = chunkMarkdown(text, 25);

    expect(chunked).toContain("Line 1 is here.");
    expect(chunked).toContain("...[TRUNCATED]");
  });

  it("forces substring split when no newlines exist", () => {
    const text = "A".repeat(100);
    const chunked = chunkMarkdown(text, 50);

    expect(chunked).toBe("A".repeat(50) + "...[TRUNCATED]");
  });
});
