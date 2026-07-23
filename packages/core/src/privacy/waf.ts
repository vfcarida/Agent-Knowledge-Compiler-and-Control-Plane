/**
 * WAF (Web Application Firewall) for prompt injection detection.
 *
 * Strategy:
 * 1. If LAKERA_API_KEY is set, use Lakera AI API (production-grade ML detection)
 * 2. Otherwise, fall back to local regex heuristics (development/offline mode)
 *
 * The regex fallback prioritizes low false-positive rate over catch-all detection.
 * It targets KNOWN injection patterns with sufficient context to avoid flagging
 * legitimate technical text. For production use, always configure Lakera.
 *
 * References:
 * - OWASP LLM01: Prompt Injection
 * - https://www.lakera.ai/
 */

export interface WAFResult {
  flagged: boolean;
  reason?: string;
  provider: "lakera" | "openai" | "regex-fallback";
}

export interface ISecurityGateway {
  // eslint-disable-next-line no-unused-vars
  checkPrompt(prompt: string): Promise<WAFResult>;
}

export class LakeraGateway implements ISecurityGateway {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.LAKERA_API_KEY;
  }

  async checkPrompt(prompt: string): Promise<WAFResult> {
    if (!this.apiKey) {
      console.warn(
        "[WAF] LAKERA_API_KEY not set. Falling back to local Regex heuristic.",
      );
      return this.regexFallback(prompt);
    }

    try {
      const response = await fetch(
        "https://api.lakera.ai/v1/prompt_injection",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input: prompt }),
        },
      );

      if (!response.ok) {
        throw new Error(`Lakera API error: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        flagged?: boolean;
        results?: Array<{ flagged?: boolean }>;
      };

      // Lakera typically returns a "flagged" boolean or "results[0].flagged" depending on the version.
      // Assuming a generic schema where `flagged: true` indicates malicious intent.
      const isFlagged =
        data.flagged || (data.results && data.results[0]?.flagged);

      return {
        flagged: !!isFlagged,
        reason: isFlagged
          ? "Lakera AI detected potential prompt injection"
          : undefined,
        provider: "lakera",
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(
        `[WAF] Lakera API call failed (${err.message}). Falling back to local Regex.`,
      );
      return this.regexFallback(prompt);
    }
  }

  private regexFallback(prompt: string): WAFResult {
    const injectionPatterns: Array<{ pattern: RegExp; description: string }> = [
      // Direct instruction override attempts
      {
        pattern:
          /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|guidelines)/i,
        description: "instruction override",
      },
      {
        pattern:
          /disregard\s+(all\s+)?(previous|prior)\s+(instructions|context)/i,
        description: "instruction disregard",
      },

      // Role hijacking
      {
        pattern: /you\s+are\s+now\s+(a|an|acting\s+as)\s+/i,
        description: "role hijacking",
      },
      {
        pattern: /pretend\s+(you\s+are|to\s+be)\s+/i,
        description: "role pretend",
      },
      { pattern: /act\s+as\s+(a|an|if)\s+/i, description: "role reassignment" },

      // System prompt extraction
      {
        pattern:
          /(?:reveal|show|display|print|output)\s+(?:your\s+)?system\s+prompt/i,
        description: "system prompt extraction",
      },
      {
        pattern:
          /what\s+(?:are|is)\s+your\s+(?:system\s+)?(?:instructions|prompt|rules)/i,
        description: "instruction probing",
      },

      // SQL injection (in context of tool params)
      { pattern: /(?:;\s*)?drop\s+table\b/i, description: "SQL injection" },
      {
        pattern: /(?:;\s*)?(?:union\s+select|insert\s+into|delete\s+from)\b/i,
        description: "SQL injection",
      },
      {
        pattern: /'\s*(?:or|and)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
        description: "SQL injection",
      },

      // Delimiter injection
      { pattern: /\[SYSTEM\]/i, description: "delimiter injection" },
      { pattern: /<<SYS>>/i, description: "delimiter injection" },
      { pattern: /```system/i, description: "code block injection" },

      // Encoding bypass attempts
      { pattern: /base64\s*decode|eval\s*\(/i, description: "encoding bypass" },
    ];

    for (const { pattern, description } of injectionPatterns) {
      if (pattern.test(prompt)) {
        return {
          flagged: true,
          reason: `Regex heuristics matched: ${description} (${pattern})`,
          provider: "regex-fallback",
        };
      }
    }

    return {
      flagged: false,
      provider: "regex-fallback",
    };
  }
}
