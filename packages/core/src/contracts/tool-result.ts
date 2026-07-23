export type ToolSuccess<T> = {
  ok: true;
  data: T;
  meta: {
    requestId: string;
    toolName: string;
    toolVersion: string;
    schemaVersion: string;
    durationMs: number;
    riskLevel?: "low" | "medium" | "high" | "critical";
  };
};

export type ToolFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    retryable: boolean;
  };
  meta: {
    requestId: string;
    toolName: string;
    toolVersion: string;
    durationMs: number;
  };
};

export type ToolResult<T> = ToolSuccess<T> | ToolFailure;

export function createToolSuccess<T>(
  data: T,
  meta: Omit<ToolSuccess<T>["meta"], "schemaVersion">,
): ToolSuccess<T> {
  return {
    ok: true,
    data,
    meta: {
      ...meta,
      schemaVersion: "1.0.0",
    },
  };
}

export function createToolFailure(
  message: string,
  code: string,
  meta: ToolFailure["meta"],
  details?: Record<string, unknown>,
  retryable = false,
): ToolFailure {
  return {
    ok: false,
    error: {
      code,
      message,
      details,
      retryable,
    },
    meta,
  };
}
