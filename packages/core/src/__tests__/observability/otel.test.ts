import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  startTelemetry,
  stopTelemetry,
  withToolTracing,
  mcpToolCallsCounter,
} from "../../observability/otel.js";

vi.mock("@opentelemetry/sdk-node", () => {
  return {
    NodeSDK: vi.fn().mockImplementation(() => {
      return {
        start: vi.fn(),
        shutdown: vi.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe("OpenTelemetry integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("can start and stop telemetry safely", async () => {
    // Should not throw
    startTelemetry();
    startTelemetry(); // Idempotent check
    await stopTelemetry();
    await stopTelemetry(); // Idempotent check
  });

  it("can trace tool executions successfully", async () => {
    const fn = vi.fn().mockResolvedValue("test-result");
    const result = await withToolTracing("myTool", "1.0", "req-123", fn);

    expect(result.data).toBe("test-result");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(fn).toHaveBeenCalled();
  });

  it("can trace tool executions that throw errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("tool error"));

    await expect(
      withToolTracing("myTool", "1.0", "req-123", fn),
    ).rejects.toThrow("tool error");
  });
});
