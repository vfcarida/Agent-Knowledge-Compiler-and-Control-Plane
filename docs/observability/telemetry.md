# OCF Telemetry Guidelines

The Agent Knowledge Compiler and Control Plane uses OpenTelemetry (OTel) for distributed tracing, metrics, and structured logging.

## Initialization
Telemetry is initialized automatically when the MCP servers start. It intercepts Node.js built-ins and provides standard spans for file system operations, HTTP requests, and Playwright orchestrations.

## Redaction
Since OCF handles highly sensitive personal data (PII), we strictly adhere to:
1. No raw file contents in traces.
2. No cookie/session tokens in HTTP spans.
3. No LLM prompts logged without explicit user opt-in.

## Configuration
Set the standard OTel environment variables (e.g., `OTEL_EXPORTER_OTLP_ENDPOINT`) to send telemetry to an external collector like Jaeger or Prometheus. If not set, traces are not exported.
