/**
 * @module observability/otel
 * @description Setup OpenTelemetry SDK Node wrapper for telemetry and metrics.
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { trace, metrics, SpanStatusCode } from "@opentelemetry/api";

let sdk: NodeSDK | null = null;

import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";

/**
 * Initialize OpenTelemetry tracer and instrumentations.
 */
export function startTelemetry(): void {
  if (sdk) return;

  const traceExporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPTraceExporter()
    : undefined;

  const metricReader = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPMetricExporter()
    : undefined;

  sdk = new NodeSDK({
    traceExporter,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    metricReader: metricReader,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  try {
    sdk.start();
    console.error(
      "[AKCP Telemetry] OpenTelemetry NodeSDK initialized successfully.",
    );
  } catch (err) {
    console.error("[AKCP Telemetry] Failed to initialize OpenTelemetry:", err);
  }
}

/**
 * Stop OpenTelemetry SDK Node context.
 */
export async function stopTelemetry(): Promise<void> {
  if (!sdk) return;
  try {
    await sdk.shutdown();
    console.error("[AKCP Telemetry] OpenTelemetry NodeSDK shut down.");
  } catch (err) {
    console.error("[AKCP Telemetry] Error shutting down OpenTelemetry:", err);
  }
}

// ─── Custom Metrics Definitions ───────────────────────────────────────────────

const meter = metrics.getMeter("akcp");

// Metrics counters
export const mcpToolCallsCounter = meter.createCounter(
  "akcp_mcp_tool_calls_total",
  {
    description: "Total number of MCP tool calls executed",
  },
);

export const mcpToolFailuresCounter = meter.createCounter(
  "akcp_mcp_tool_failures_total",
  {
    description: "Total number of MCP tool calls that resulted in errors",
  },
);

export const okfParseFailuresCounter = meter.createCounter(
  "akcp_okf_parse_failures_total",
  {
    description: "Total number of YAML/Markdown OKF parse failures",
  },
);

export const bundleMigrationsCounter = meter.createCounter(
  "akcp_bundle_migrations_total",
  {
    description: "Total number of OKF bundle migration processes triggered",
  },
);

export const automationAttemptsCounter = meter.createCounter(
  "akcp_automation_attempts_total",
  {
    description: "Total number of Playwright automation workflows triggered",
  },
);

export const automationApprovalRequiredCounter = meter.createCounter(
  "akcp_automation_approval_required_total",
  {
    description:
      "Total number of job submissions requiring explicit human approval",
  },
);

export const automationSubmissionSuccessCounter = meter.createCounter(
  "akcp_automation_submission_success_total",
  {
    description:
      "Total number of successful job submissions registered in bundle",
  },
);

export const bundleValidationFailuresCounter = meter.createCounter(
  "akcp_bundle_validation_failures_total",
  {
    description: "Total number of OKF bundle validation errors",
  },
);

export const automationPreviewsCounter = meter.createCounter(
  "akcp_automation_previews_total",
  {
    description: "Total number of automation job previews requested",
  },
);

export const automationSubmissionBlockedCounter = meter.createCounter(
  "akcp_automation_submission_blocked_total",
  {
    description: "Total number of job submissions blocked by policy or HITL",
  },
);

export const mcpToolDurationHistogram = meter.createHistogram(
  "akcp_mcp_tool_duration_ms",
  {
    description: "Duration of MCP tool executions in milliseconds",
  },
);

// ─── Tracing Helpers ─────────────────────────────────────────────────────────

export const tracer = trace.getTracer("akcp");

/**
 * Wraps an async function with an OpenTelemetry span and records duration.
 */
export async function withToolTracing<T>(
  toolName: string,
  toolVersion: string,
  requestId: string,
  fn: () => Promise<T>,
): Promise<{ data: T; durationMs: number }> {
  return tracer.startActiveSpan(`tool:${toolName}`, async (span) => {
    span.setAttribute("tool.name", toolName);
    span.setAttribute("tool.version", toolVersion);
    span.setAttribute("request.id", requestId);

    const start = performance.now();
    try {
      const data = await fn();
      const end = performance.now();
      const durationMs = end - start;
      mcpToolDurationHistogram.record(durationMs, { toolName });
      span.setAttribute("tool.duration_ms", durationMs);
      span.setStatus({ code: SpanStatusCode.OK });
      return { data, durationMs };
    } catch (err: any) {
      const end = performance.now();
      const durationMs = end - start;
      mcpToolDurationHistogram.record(durationMs, { toolName });
      span.setAttribute("tool.duration_ms", durationMs);
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      throw err;
    } finally {
      span.end();
    }
  });
}
