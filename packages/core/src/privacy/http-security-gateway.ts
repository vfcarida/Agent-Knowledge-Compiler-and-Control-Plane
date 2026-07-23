import type { PiiRedactionResult } from "./pii-redactor.js";
import type { PiiMatch } from "./pii-detector.js";

/**
 * Client for interacting with external Security Gateways (e.g., Presidio, AWS Macie, Custom DLP engines).
 * Uses a standardized JSON REST payload.
 */
export class HttpSecurityGateway {
  private gatewayUrl: string;
  private tokenFormat: string;

  constructor(gatewayUrl: string, tokenFormat: string = "<REDACTED_{class}>") {
    this.gatewayUrl = gatewayUrl;
    this.tokenFormat = tokenFormat;
  }

  async redact(
    text: string,
    options: {
      mode: "redact" | "block";
      allowedClasses?: string[];
      blockedClasses?: string[];
      failOnUnredactedHighRiskPii?: boolean;
    },
  ): Promise<PiiRedactionResult> {
    try {
      const response = await fetch(this.gatewayUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          mode: options.mode,
          allowedClasses: options.allowedClasses || [],
          blockedClasses: options.blockedClasses || [],
          tokenFormat: this.tokenFormat,
          failOnUnredactedHighRiskPii:
            options.failOnUnredactedHighRiskPii || false,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Security Gateway returned ${response.status}: ${response.statusText}`,
        );
      }

      const data = (await response.json()) as {
        redactedText?: string;
        findings?: PiiMatch[];
        blocked?: boolean;
      };

      return {
        redactedText: data.redactedText || text,
        findings: data.findings || [],
        blocked: data.blocked || false,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // If the gateway fails, fail closed if we are in block mode, or throw error.
      console.warn(`[WARN] Security Gateway call failed: ${err.message}`);
      throw new Error(
        `[PII_ERROR] Failed to reach Security Gateway at ${this.gatewayUrl}`,
      );
    }
  }
}
