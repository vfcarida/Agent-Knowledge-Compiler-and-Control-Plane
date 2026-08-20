import { describe, it, expect } from "vitest";
import {
  createToolSuccess,
  createToolFailure,
} from "../../contracts/tool-result.js";

describe("ToolResult Contracts", () => {
  it("creates a standardized ToolSuccess object", () => {
    const res = createToolSuccess(
      { items: [1, 2, 3] },
      {
        requestId: "req-123",
        toolName: "list_items",
        toolVersion: "1.0.0",
        durationMs: 42,
        riskLevel: "low",
      },
    );

    expect(res.ok).toBe(true);
    expect(res.data).toEqual({ items: [1, 2, 3] });
    expect(res.meta.schemaVersion).toBe("1.0.0");
    expect(res.meta.requestId).toBe("req-123");
    expect(res.meta.durationMs).toBe(42);
  });

  it("creates a standardized ToolFailure object", () => {
    const res = createToolFailure(
      "Document not found",
      "NOT_FOUND",
      {
        requestId: "req-456",
        toolName: "read_document",
        toolVersion: "1.0.0",
        durationMs: 15,
      },
      { docId: "doc-999" },
      true,
    );

    expect(res.ok).toBe(false);
    expect(res.error.code).toBe("NOT_FOUND");
    expect(res.error.message).toBe("Document not found");
    expect(res.error.details).toEqual({ docId: "doc-999" });
    expect(res.error.retryable).toBe(true);
    expect(res.meta.requestId).toBe("req-456");
  });
});
