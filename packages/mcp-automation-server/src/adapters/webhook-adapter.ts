import crypto from "node:crypto";
import { z } from "zod";
import type {
  ActionContext,
  ActionRegistry,
  ActionResult,
} from "../action-registry.js";

export interface WebhookAdapterConfig {
  signingSecret: string;
  allowedHosts?: string[];
  allowLocalhostForTesting?: boolean;
  maxRetries?: number;
  baseDelayMs?: number;
  fetchImpl?: typeof fetch;
}

export const DispatchWebhookSchema = z.object({
  url: z.string().url(),
  eventType: z.string().min(1),
  payload: z.record(z.unknown()),
  traceId: z.string().optional(),
});

const PRIVATE_IPV4_RANGES: RegExp[] = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^0\./,
];

/**
 * Validates a target webhook URL against SSRF vectors (metadata endpoints, loopback,
 * RFC1918 private networks, and non-HTTP/HTTPS schemes).
 */
export function validateWebhookTargetUrl(
  rawUrl: string,
  options: { allowedHosts?: string[]; allowLocalhostForTesting?: boolean } = {},
): { valid: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, reason: "Malformed URL" };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      valid: false,
      reason: `Unsupported URL scheme '${parsed.protocol}'. Only HTTP(S) is permitted.`,
    };
  }

  const host = parsed.hostname.toLowerCase();

  // Always block cloud metadata endpoints
  if (
    host === "169.254.169.254" ||
    host === "metadata.google.internal" ||
    host === "100.100.100.200"
  ) {
    return {
      valid: false,
      reason: `SSRF protection blocked cloud metadata host '${host}'.`,
    };
  }

  const isLoopback =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]";

  if (isLoopback && !options.allowLocalhostForTesting) {
    return {
      valid: false,
      reason: `SSRF protection blocked loopback host '${host}'.`,
    };
  }

  if (
    !isLoopback &&
    PRIVATE_IPV4_RANGES.some((re) => re.test(host)) &&
    !options.allowLocalhostForTesting
  ) {
    return {
      valid: false,
      reason: `SSRF protection blocked private network IP '${host}'.`,
    };
  }

  if (options.allowedHosts && options.allowedHosts.length > 0) {
    const allowedSet = new Set(
      options.allowedHosts.map((h) => h.toLowerCase()),
    );
    if (!allowedSet.has(host)) {
      return {
        valid: false,
        reason: `Host '${host}' is not in the configured allowedHosts list.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Computes the deterministic HMAC-SHA256 signature header (`sha256=<hex>`) over `${timestamp}.${rawBody}`.
 */
export function computeWebhookSignature(
  rawBody: string,
  timestamp: string,
  secret: string,
): string {
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  return `sha256=${hmac}`;
}

/**
 * Constant-time verification of an HMAC-SHA256 webhook signature.
 */
export function verifyWebhookSignature(
  rawBody: string,
  timestamp: string,
  signatureHeader: string,
  secret: string,
): boolean {
  const expected = computeWebhookSignature(rawBody, timestamp, secret);
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signatureHeader, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

function buildW3CTraceparent(traceId?: string): string {
  const cleanTraceId =
    traceId && /^[0-9a-f]{32}$/i.test(traceId)
      ? traceId.toLowerCase()
      : crypto.randomBytes(16).toString("hex");
  const spanId = crypto.randomBytes(8).toString("hex");
  return `00-${cleanTraceId}-${spanId}-01`;
}

export class SignedWebhookAdapter {
  private readonly signingSecret: string;
  private readonly allowedHosts?: string[];
  private readonly allowLocalhostForTesting: boolean;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(config: WebhookAdapterConfig) {
    if (!config.signingSecret || config.signingSecret.trim().length < 8) {
      throw new Error(
        "SignedWebhookAdapter requires a signingSecret of at least 8 characters.",
      );
    }
    this.signingSecret = config.signingSecret;
    this.allowedHosts = config.allowedHosts;
    this.allowLocalhostForTesting = Boolean(config.allowLocalhostForTesting);
    this.maxRetries = config.maxRetries ?? 2;
    this.baseDelayMs = config.baseDelayMs ?? 20;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async dispatch(
    rawParams: unknown,
    context: ActionContext = {},
  ): Promise<ActionResult> {
    const parsed = DispatchWebhookSchema.safeParse(rawParams);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    const { url, eventType, payload, traceId } = parsed.data;
    const urlCheck = validateWebhookTargetUrl(url, {
      allowedHosts: this.allowedHosts,
      allowLocalhostForTesting: this.allowLocalhostForTesting,
    });
    if (!urlCheck.valid) {
      return { success: false, error: urlCheck.reason };
    }

    const deliveryId = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const envelope = {
      deliveryId,
      eventType,
      agentId: context.agentId ?? "anonymous",
      domain: context.domain ?? "general",
      timestamp,
      payload,
    };
    const rawBody = JSON.stringify(envelope);
    const signature = computeWebhookSignature(
      rawBody,
      timestamp,
      this.signingSecret,
    );
    const traceparent = buildW3CTraceparent(traceId);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-AKCP-Signature-256": signature,
      "X-AKCP-Timestamp": timestamp,
      "X-AKCP-Delivery-Id": deliveryId,
      "X-AKCP-Event": eventType,
      traceparent,
    };

    let lastError = "Unknown webhook dispatch error";
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await this.fetchImpl(url, {
          method: "POST",
          headers,
          body: rawBody,
        });

        if (res.ok) {
          return {
            success: true,
            data: {
              deliveryId,
              status: res.status,
              attempts: attempt + 1,
              signature,
              traceparent,
            },
          };
        }

        lastError = `Webhook target responded with HTTP ${res.status}`;
        // Do not retry 4xx client errors
        if (res.status >= 400 && res.status < 500) {
          break;
        }
      } catch (err) {
        lastError = (err as Error).message;
      }

      if (attempt < this.maxRetries) {
        const delay = this.baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: lastError,
    };
  }
}

export function registerWebhookActions(
  registry: ActionRegistry,
  config: WebhookAdapterConfig,
): SignedWebhookAdapter {
  const adapter = new SignedWebhookAdapter(config);

  registry.register({
    id: "dispatch_signed_webhook",
    description:
      "Dispatch an HMAC-SHA256 signed webhook with SSRF protection and W3C TraceContext propagation",
    domain: "integrations",
    riskLevel: "medium",
    parameters: DispatchWebhookSchema,
    handler: (params, ctx) => adapter.dispatch(params, ctx),
  });

  return adapter;
}
